import { supabase } from './supabaseClient';
import { Contract, ContractInstance } from '@/types/contract';

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
  async createContractInstance(bookingId: string, templateType: string): Promise<ContractInstance> {
    if (!['collaboration', 'content_creation'].includes(templateType)) {
      throw new Error("Invalid template type.");
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

    const variables = {
      customer_name: booking.customer?.name || "NOT GIVEN",
      influencer_name: booking.influencer?.name || "NOT GIVEN",
      invited_influencer_name: booking.invited_influencer?.name || "NOT GIVEN"
    };

    let generatedContent = template.content;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      generatedContent = generatedContent.replace(regex, String(value));
    });

    const instanceData = {
      template_id: template.id,
      customer_id: booking.customer_id,
      influencer_id: booking.influencer_id,
      booking_id: bookingId,
      status: 'draft',
      variables_data: variables,
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
  }
};
