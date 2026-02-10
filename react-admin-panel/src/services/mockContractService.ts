import { Contract, ContractInstance } from '@/types/contract';

// Mock data for contracts
const mockContracts: Contract[] = [
  {
    id: '1',
    title: 'Influencer Collaboration Agreement',
    template_type: 'collaboration',
    content: 'This agreement is between {{brand_name}} and {{influencer_name}} for a collaboration on {{platform}} starting on {{start_date}} and ending on {{end_date}}. The compensation will be {{amount}}.',
    variables: ['brand_name', 'influencer_name', 'platform', 'start_date', 'end_date', 'amount'],
    is_active: true,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    title: 'Content Creation Contract',
    template_type: 'content_creation',
    content: '{{influencer_name}} agrees to create {{content_type}} content for {{brand_name}} on {{platform}}. The content must be delivered by {{delivery_date}} and will be compensated with {{amount}}.',
    variables: ['influencer_name', 'content_type', 'brand_name', 'platform', 'delivery_date', 'amount'],
    is_active: true,
    created_at: '2024-01-10T14:30:00Z',
    updated_at: '2024-01-10T14:30:00Z'
  },
  {
    id: '3',
    title: 'Brand Ambassador Agreement',
    template_type: 'ambassador',
    content: '{{influencer_name}} will serve as a brand ambassador for {{brand_name}} for a period of {{duration}} months. This includes {{requirements}} and compensation of {{amount}} per month.',
    variables: ['influencer_name', 'brand_name', 'duration', 'requirements', 'amount'],
    is_active: true,
    created_at: '2024-01-05T09:15:00Z',
    updated_at: '2024-01-05T09:15:00Z'
  }
];

const mockContractInstances: ContractInstance[] = [
  {
    id: '1',
    template_id: '1',
    customer_id: 'customer-1',
    influencer_id: 'influencer-1',
    status: 'active',
    variables: {
      brand_name: 'TechCorp',
      influencer_name: 'John Doe',
      platform: 'Instagram',
      start_date: '2024-02-01',
      end_date: '2024-02-28',
      amount: '$5,000'
    },
    generated_content: 'This agreement is between TechCorp and John Doe for a collaboration on Instagram starting on 2024-02-01 and ending on 2024-02-28. The compensation will be $5,000.',
    created_at: '2024-01-20T11:00:00Z'
  },
  {
    id: '2',
    template_id: '2',
    customer_id: 'customer-2',
    influencer_id: 'influencer-2',
    status: 'pending',
    variables: {
      influencer_name: 'Jane Smith',
      content_type: 'Video Review',
      brand_name: 'FashionBrand',
      platform: 'YouTube',
      delivery_date: '2024-02-15',
      amount: '$3,000'
    },
    generated_content: 'Jane Smith agrees to create Video Review content for FashionBrand on YouTube. The content must be delivered by 2024-02-15 and will be compensated with $3,000.',
    created_at: '2024-01-18T16:45:00Z'
  }
];

export const mockContractService = {
  // Fetch all contract templates
  async getContractTemplates(): Promise<Contract[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockContracts;
  },

  // Fetch contract template by ID
  async getContractTemplate(id: string): Promise<Contract> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const contract = mockContracts.find(c => c.id === id);
    if (!contract) {
      throw new Error('Contract template not found');
    }
    return contract;
  },

  // Create new contract template
  async createContractTemplate(contract: Omit<Contract, 'id' | 'created_at' | 'updated_at'>): Promise<Contract> {
    await new Promise(resolve => setTimeout(resolve, 800));
    const newContract: Contract = {
      ...contract,
      id: String(mockContracts.length + 1),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockContracts.push(newContract);
    return newContract;
  },

  // Update contract template
  async updateContractTemplate(id: string, updates: Partial<Contract>): Promise<Contract> {
    await new Promise(resolve => setTimeout(resolve, 600));
    const index = mockContracts.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Contract template not found');
    }
    mockContracts[index] = {
      ...mockContracts[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return mockContracts[index];
  },

  // Delete contract template
  async deleteContractTemplate(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = mockContracts.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Contract template not found');
    }
    mockContracts.splice(index, 1);
  },

  // Fetch all contract instances
  async getContractInstances(): Promise<ContractInstance[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockContractInstances;
  },

  // Create new contract instance
  async createContractInstance(instance: Omit<ContractInstance, 'id' | 'created_at'>): Promise<ContractInstance> {
    await new Promise(resolve => setTimeout(resolve, 800));
    const newInstance: ContractInstance = {
      ...instance,
      id: String(mockContractInstances.length + 1),
      created_at: new Date().toISOString(),
    };
    mockContractInstances.push(newInstance);
    return newInstance;
  },

  // Update contract instance
  async updateContractInstance(id: string, updates: Partial<ContractInstance>): Promise<ContractInstance> {
    await new Promise(resolve => setTimeout(resolve, 600));
    const index = mockContractInstances.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Contract instance not found');
    }
    mockContractInstances[index] = {
      ...mockContractInstances[index],
      ...updates,
    };
    return mockContractInstances[index];
  },

  // Generate contract from template with variables
  async generateContract(templateId: string, variables: Record<string, any>): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 300));
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
