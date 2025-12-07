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
  async createContractInstance(instance: Omit<ContractInstance, 'id' | 'created_at'>): Promise<ContractInstance> {
    const { data, error } = await supabase
      .from('contract_instances')
      .insert([{
        ...instance,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
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
