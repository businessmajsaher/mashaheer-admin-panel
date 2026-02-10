# Mashaheer Admin Panel

A comprehensive React-based admin panel for Mashaheer built with Ant Design components and Supabase as the backend. This application provides full CRUD operations for service categories, services, and bookings with advanced filtering and image upload capabilities.

## 🚀 Features

### 1. Service Categories Management
- **List all categories** with pagination and search functionality
- **Add new categories** with fields: name, description, thumbnail, icon
- **Edit & delete categories** with image upload support
- **Supabase Storage integration** for thumbnail uploads
- **Responsive forms** with validation

### 2. Services Management
- **List services** with advanced filters (by category, status, type, influencer)
- **Create/Edit services** with comprehensive fields:
  - Basic info: title, description, thumbnail
  - Duration: min_duration_days
  - Flash deals: is_flash_deal, flash_from, flash_to
  - Location: location_required
  - Service details: about_us, service_type (normal/dual/flash)
  - Relationships: influencer_id, duo_influencer_id, category_id, platform_id
- **Conditional logic** for duo influencers:
  - If `duo_influencer_id` is set and created from app → creates invite record with status `pending`
  - If created from admin, skips invite logic
- **Automatic flash deal expiration** handling
- **Image upload** with Supabase Storage

### 3. Bookings Management
- **View bookings** with comprehensive filters (by service, influencer, date range)
- **Show detailed booking information** in modal
- **Update booking status** (pending, approved, completed, canceled)
- **Edit booking details** with form validation
- **Real-time status updates**

## 🛠️ Technology Stack

- **Frontend**: React 19 with TypeScript
- **UI Components**: Ant Design (antd)
- **Backend**: Supabase (Database + Storage)
- **Routing**: React Router DOM
- **Date Handling**: Day.js
- **Build Tool**: Vite

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd react-admin-panel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 🗄️ Database Schema

### Service Categories Table
```sql
CREATE TABLE service_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  thumbnail TEXT,
  icon VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Services Table
```sql
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
  influencer_id UUID REFERENCES users(id),
  duo_influencer_id UUID REFERENCES users(id),
  category_id UUID REFERENCES service_categories(id),
  platform_id UUID REFERENCES platforms(id),
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Bookings Table
```sql
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES services(id),
  influencer_id UUID REFERENCES users(id),
  customer_id UUID REFERENCES users(id),
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'canceled')),
  booking_date DATE NOT NULL,
  duration_days INTEGER NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  location VARCHAR,
  special_requirements TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Service Invites Table (for duo services)
```sql
CREATE TABLE service_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES services(id),
  influencer_id UUID REFERENCES users(id),
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🎯 Key Features Implementation

### Image Upload with Supabase Storage
- Automatic file upload to Supabase Storage
- Public URL generation for thumbnails
- Support for multiple image formats
- Error handling for upload failures

### Advanced Filtering
- **Categories**: Search by name and description
- **Services**: Filter by category, status, type, influencer, and search text
- **Bookings**: Filter by service, influencer, status, and date range

### Conditional Logic
- **Duo Influencer Handling**: Automatic invite creation when services are created from the app
- **Flash Deal Management**: Automatic expiration handling
- **Status Management**: Real-time status updates with color-coded tags

### Form Validation
- Required field validation
- Date range validation for flash deals
- Image type validation
- Numeric input validation

## 📱 Responsive Design

All components are built with Ant Design's responsive grid system:
- **Desktop**: Full feature set with side-by-side forms
- **Tablet**: Optimized layouts with stacked form fields
- **Mobile**: Touch-friendly interfaces with simplified navigation

## 🔧 Customization

### Adding New Fields
1. Update the TypeScript interfaces in `/src/types/`
2. Modify the service layer in `/src/services/`
3. Update the UI components with new form fields
4. Add validation rules as needed

### Styling
- Uses Ant Design's theme system
- Custom CSS can be added to `/src/index.css`
- Component-specific styles can be added inline or in separate CSS files

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel/Netlify
1. Connect your repository
2. Set environment variables
3. Deploy automatically on push

## 📝 API Documentation

### Category Service
- `getCategories(page, limit, search)` - Get paginated categories
- `getCategory(id)` - Get single category
- `createCategory(data)` - Create new category with image upload
- `updateCategory(id, data)` - Update category
- `deleteCategory(id)` - Delete category

### Service Service
- `getServices(page, limit, filters)` - Get filtered services
- `getService(id)` - Get single service
- `createService(data, isFromAdmin)` - Create service with conditional logic
- `updateService(id, data)` - Update service
- `deleteService(id)` - Delete service
- `disableExpiredFlashDeals()` - Auto-disable expired flash deals

### Booking Service
- `getBookings(page, limit, filters)` - Get filtered bookings
- `getBooking(id)` - Get single booking
- `createBooking(data)` - Create booking
- `updateBooking(id, data)` - Update booking
- `updateBookingStatus(id, status)` - Update booking status
- `deleteBooking(id)` - Delete booking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code examples

---

**Built with ❤️ using React, Ant Design, and Supabase**
