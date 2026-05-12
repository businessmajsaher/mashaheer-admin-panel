import { supabase } from './supabaseClient';
import { Contract, ContractInstance, ContractSignature } from '@/types/contract';

export const contractService = {
  // Fetch all contract templates
  async getContractTemplates(): Promise<Contract[]> {
    const { data, error } = await supabase
      .from('contract_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Fetch contract template by ID
  async getContractTemplate(id: string): Promise<Contract> {
    const { data, error } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create new contract template
  async createContractTemplate(contract: Omit<Contract, 'id' | 'created_at' | 'updated_at'>): Promise<Contract> {
    if (!['collaboration', 'content_creation'].includes(contract.template_type)) {
      throw new Error("Invalid template type. Allowed values are 'collaboration' or 'content_creation'.");
    }

    if (contract.is_active) {
      await supabase
        .from('contract_templates')
        .update({ is_active: false })
        .eq('template_type', contract.template_type)
        .eq('is_active', true);
    }

    const { data, error } = await supabase
      .from('contract_templates')
      .insert([{
        ...contract,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update contract template
  async updateContractTemplate(id: string, updates: Partial<Contract>): Promise<Contract> {
    if (updates.template_type && !['collaboration', 'content_creation'].includes(updates.template_type)) {
      throw new Error("Invalid template type. Allowed values are 'collaboration' or 'content_creation'.");
    }

    const currentTemplate = await this.getContractTemplate(id);
    const typeToCheck = updates.template_type || currentTemplate.template_type;

    if (updates.is_active === false) {
      const { count } = await supabase
        .from('contract_templates')
        .select('*', { count: 'exact', head: true })
        .eq('template_type', typeToCheck)
        .eq('is_active', true)
        .neq('id', id);

      if (count === 0) {
        throw new Error("At least one active template must exist for this template type.");
      }
    } else if (updates.is_active === true) {
      await supabase
        .from('contract_templates')
        .update({ is_active: false })
        .eq('template_type', typeToCheck)
        .eq('is_active', true)
        .neq('id', id);
    }

    const { data, error } = await supabase
      .from('contract_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete contract template
  async deleteContractTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('contract_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Fetch all contract instances
  async getContractInstances(): Promise<ContractInstance[]> {
    const { data, error } = await supabase
      .from('contract_instances')
      .select(`
        *,
        contract_templates(title, template_type),
        customer:profiles!contract_instances_customer_id_fkey(name, email),
        influencer:profiles!contract_instances_influencer_id_fkey(name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create new contract instance
  async createContractInstance(bookingId: string, templateType: string, variables: Record<string, any>): Promise<ContractInstance> {
    if (!['collaboration', 'content_creation'].includes(templateType)) {
      throw new Error("Invalid template type.");
    }

    if (!variables || Object.keys(variables).length === 0) {
      throw new Error("Variables cannot be empty");
    }

    const { data: template, error: templateError } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('template_type', templateType)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      throw new Error(`No active template found for type: ${templateType}`);
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:profiles!customer_id(name),
        influencer:profiles!influencer_id(name),
        invited_influencer:profiles!invited_influencer_id(name)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    const replacementVars: Record<string, any> = {
      customer_name: (booking as any)?.customer?.name || "N/A",
      customer_id: booking?.customer_id || "N/A",
      influencer_name: (booking as any)?.influencer?.name || "N/A",
      influencer_id: booking?.influencer_id || "N/A",
      invited_influencer_name: (booking as any)?.invited_influencer?.name || "N/A",
      invited_influencer_id: booking?.invited_influencer_id || "N/A",
      ...variables
    };

    let generatedContent = template.content;

    Object.entries(replacementVars).forEach(([key, value]) => {
      // Flexible regex: handles spaces, underscores, and case insensitivity
      // e.g. matches {{customer_name}}, {{customer name}}, {{ Customer Name }}
      const searchKey = key.replace(/_/g, '[_\\s]');
      const regex = new RegExp(`\\{\\{\\s*${searchKey}\\s*\\}\\}`, 'gi');
      generatedContent = generatedContent.replace(regex, String(value));
    });

    const instanceData = {
      template_id: template.id,
      customer_id: booking.customer_id,
      influencer_id: booking.influencer_id,
      booking_id: bookingId,
      status: 'draft',
      variables: replacementVars,
      generated_content: generatedContent,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('contract_instances')
      .insert([instanceData])
      .select()
      .single();

    if (error) throw error;
    return data as ContractInstance;
  },

  // Update contract instance
  async updateContractInstance(id: string, updates: Partial<ContractInstance>): Promise<ContractInstance> {
    const { data, error } = await supabase
      .from('contract_instances')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Generate contract from template with variables
  async generateContract(templateId: string, variables: Record<string, any>): Promise<string> {
    const template = await this.getContractTemplate(templateId);

    let generatedContent = template.content;

    // Replace variables in the template
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      generatedContent = generatedContent.replace(regex, String(value));
    });

    return generatedContent;
  },

  // Extract variables from template content
  extractVariables(content: string): string[] {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  },

  // Generate contract HTML with signatures injected for download
  async downloadContractHtml(instanceId: string, signerType?: 'customer' | 'influencer'): Promise<string> {
    const { data: instance, error: instanceError } = await supabase
      .from('contract_instances')
      .select('*')
      .eq('id', instanceId)
      .single();

    if (instanceError || !instance) {
      throw new Error("Contract not found");
    }

    // Only allow download for signed, active or completed contracts
    if (!['signed', 'active', 'completed'].includes(instance.status)) {
      throw new Error(`Contract must be signed, active, or completed to download (current status: ${instance.status}).`);
    }

    const { data: signatures, error: sigError } = await supabase
      .from('contract_signatures')
      .select('*')
      .eq('contract_instance_id', instanceId);

    if (sigError) throw sigError;

    let html = instance.generated_content || '';

    // Fetch fresh booking data for robust variable replacement
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:profiles!customer_id(name),
        influencer:profiles!influencer_id(name),
        invited_influencer:profiles!invited_influencer_id(name)
      `)
      .eq('id', instance.booking_id)
      .single();

    // Merge everything for replacement: Booking details + saved instance variables
    const replacementVars: Record<string, any> = {
      customer_name: (booking as any)?.customer?.name || "N/A",
      customer_id: booking?.customer_id || "N/A",
      influencer_name: (booking as any)?.influencer?.name || "N/A",
      influencer_id: booking?.influencer_id || "N/A",
      invited_influencer_name: (booking as any)?.invited_influencer?.name || "N/A",
      invited_influencer_id: booking?.invited_influencer_id || "N/A",
      ...(instance.variables as Record<string, any> || {})
    };

    Object.entries(replacementVars).forEach(([key, value]) => {
      const searchKey = key.replace(/_/g, '[_\\s]');
      const regex = new RegExp(`\\{\\{\\s*${searchKey}\\s*\\}\\}`, 'gi');
      html = html.replace(regex, String(value));
    });

    // Final pass: Replace any remaining placeholders with N/A
    const remainingPlaceholderRegex = /\{\{\s*[^}]+\s*\}\}/g;
    html = html.replace(remainingPlaceholderRegex, 'N/A');

    const sigs = signatures as ContractSignature[];
    const influencerSig = sigs?.find(s => s.signer_type === 'influencer');
    const customerSig = sigs?.find(s => s.signer_type === 'customer');

    // Validation based on requested type
    if (signerType === 'customer' && !customerSig) {
      throw new Error("Customer signature not found.");
    }
    if (signerType === 'influencer' && !influencerSig) {
      throw new Error("Influencer signature not found.");
    }
    if (!signerType && (!influencerSig || !customerSig)) {
      throw new Error("Both signatures (Customer & Influencer) must be present for the final agreement.");
    }

    // Prepare signature blocks
    const formatSig = (data: string) => data.startsWith('data:image') ? data : `data:image/png;base64,${data}`;
    const customerSigImg = customerSig ? `<img src="${formatSig(customerSig.signature_data)}" style="max-width: 250px; height: auto;" alt="Customer Signature" />` : '';
    const influencerSigImg = influencerSig ? `<img src="${formatSig(influencerSig.signature_data)}" style="max-width: 250px; height: auto;" alt="Influencer Signature" />` : '';

    // Inject signatures into placeholders if they exist
    if (customerSigImg && html.includes('{{customer_signature}}')) {
      html = html.replace('{{customer_signature}}', customerSigImg);
    }
    if (influencerSigImg && html.includes('{{influencer_signature}}')) {
      html = html.replace('{{influencer_signature}}', influencerSigImg);
    }

    // If we're looking for a specific party copy or the final document, ensure signature is visible
    const needsSignatureSection = signerType
      ? (signerType === 'customer' ? !html.includes(customerSigImg) : !html.includes(influencerSigImg))
      : (!html.includes(customerSigImg) || !html.includes(influencerSigImg));

    if (needsSignatureSection) {
      let signatureSection = '<div class="signature-section" style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; display: flex; justify-content: space-between; flex-wrap: wrap;">';

      if (customerSig && (!signerType || signerType === 'customer')) {
        signatureSection += `
          <div style="text-align: center; width: 45%; min-width: 250px; margin-bottom: 20px;">
            <p style="font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 10px;">Customer Signature</p>
            ${customerSigImg}
            <p style="font-size: 12px; color: #666;">Signed on: ${new Date(customerSig.signed_at).toLocaleString()}</p>
          </div>
        `;
      }

      if (influencerSig && (!signerType || signerType === 'influencer')) {
        signatureSection += `
          <div style="text-align: center; width: 45%; min-width: 250px; margin-bottom: 20px;">
            <p style="font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 10px;">Influencer Signature</p>
            ${influencerSigImg}
            <p style="font-size: 12px; color: #666;">Signed on: ${new Date(influencerSig.signed_at).toLocaleString()}</p>
          </div>
        `;
      }

      signatureSection += '</div>';

      if (html.includes('</body>')) {
        html = html.replace('</body>', signatureSection + '</body>');
      } else {
        html += signatureSection;
      }
    }

    return html;
  },

  // Download only the signature as an image file
  async downloadSignatureOnly(instanceId: string, signerType: 'customer' | 'influencer'): Promise<void> {
    const { data: signature, error: sigError } = await supabase
      .from('contract_signatures')
      .select('*')
      .eq('contract_instance_id', instanceId)
      .eq('signer_type', signerType)
      .single();

    if (sigError || !signature) {
      throw new Error(`${signerType === 'customer' ? 'Customer' : 'Influencer'} signature not found.`);
    }

    let sigData = signature.signature_data;
    if (!sigData.startsWith('data:image')) {
      sigData = `data:image/png;base64,${sigData}`;
    }

    const link = document.createElement('a');
    link.href = sigData;
    link.download = `signature-${signerType}-${instanceId.slice(0, 8)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

