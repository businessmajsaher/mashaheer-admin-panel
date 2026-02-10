# Setup Guide for React Admin Panel

## 🚀 Quick Setup

### 1. Environment Variables
Create a `.env` file in the root directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Database Setup
Run these SQL commands in your Supabase SQL editor:

```sql
-- Create service_categories table
CREATE TABLE service_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  thumbnail TEXT,
  icon VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create services table
CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR NOT NULL,
  description TEXT,
  thumbnail TEXT,
  min_duration_days INTEGER NOT NULL,
  is_flash_deal BOOLEAN DEFAULT FALSE,
  flash_from TIMESTAMP WITH TIME ZONE,
  flash_to TIMESTAMP WITH TIME ZONE,
  location_required BOOLEAN DEFAULT FALSE,
  about_us TEXT,
  service_type VARCHAR CHECK (service_type IN ('normal', 'dual', 'flash')),
  influencer_id UUID,
  duo_influencer_id UUID,
  category_id UUID REFERENCES service_categories(id),
  platform_id UUID,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID,
  influencer_id UUID,
  customer_id UUID,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'canceled')),
  booking_date DATE NOT NULL,
  duration_days INTEGER NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  location VARCHAR,
  special_requirements TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create service_invites table
CREATE TABLE service_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID,
  influencer_id UUID,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Storage Setup
Create a storage bucket in Supabase:
1. Go to Storage in your Supabase dashboard
2. Create a new bucket called `thumbnails`
3. Set the bucket to public

### 4. Test Data
Insert some test categories:

```sql
INSERT INTO service_categories (name, description, icon) VALUES
('Social Media Marketing', 'Services related to social media marketing and promotion', 'instagram'),
('Content Creation', 'Video and photo content creation services', 'camera'),
('Brand Collaboration', 'Brand partnership and collaboration services', 'handshake');
```

## 🔧 Troubleshooting

### White Screen Issues
If you see a white screen on the Categories page:

1. **Check Environment Variables**: Make sure your `.env` file is properly configured
2. **Check Database**: Ensure the `service_categories` table exists
3. **Check Console**: Open browser dev tools and check for errors
4. **Check Network**: Verify Supabase connection in Network tab

### Common Errors
- **"Supabase is not configured"**: Set up your environment variables
- **"Failed to fetch categories"**: Check your database table exists
- **"Upload failed"**: Ensure storage bucket is created and public

## 🎯 Features to Test

1. **Categories Page** (`/categories`):
   - View categories list
   - Add new category
   - Edit existing category
   - Upload thumbnail image
   - Delete category

2. **Services Page** (`/services`):
   - View services with filters
   - Create new service
   - Edit service details
   - Manage flash deals

3. **Bookings Page** (`/bookings`):
   - View bookings
   - Update booking status
   - Filter by date and service

## 📱 Access the App
- **URL**: http://localhost:5173
- **Login**: Use any credentials (authentication is simplified for demo)
- **Navigation**: Use the sidebar to navigate between pages

## 🆘 Need Help?
- Check the browser console for errors
- Verify your Supabase project is active
- Ensure all environment variables are set
- Check that database tables are created 