export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  thumb?: string;
  icon?: string;
  created_at: string;
}

export interface CreateCategoryData {
  name: string;
  description: string;
  thumbnail?: File;
  icon?: string;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  thumbnail?: File;
  icon?: string;
} 