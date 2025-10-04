# Mock Data Setup for Legal & Support System

This guide explains how to use the mock data system for testing the Legal & Support features without setting up Supabase.

## 📁 Files Created

### 1. Mock Service File
- **File**: `src/services/mockLegalSupportService.ts`
- **Purpose**: Contains all mock data and service functions that simulate API calls
- **Features**: 
  - Realistic data with proper TypeScript types
  - Simulated network delays (200-500ms)
  - Full CRUD operations
  - Search and filtering capabilities

### 2. Updated Components
All existing components have been updated to use the mock services:

- **Legal Notices** (`src/pages/LegalNotices/LegalNotices.tsx`)
- **Contact Support** (`src/pages/ContactSupport/ContactSupport.tsx`) 
- **Help & Support** (`src/pages/HelpSupport/HelpSupport.tsx`)

## 🚀 How to Use

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Navigate to the Features
- **Legal Notices**: `/legal-notices`
- **Contact Support**: `/contact-support`
- **Help & Support**: `/help-support`

### 3. Test the Features

#### Legal Notices
- ✅ View all legal notices
- ✅ Edit notice content (HTML)
- ✅ Save changes (simulated)
- ✅ See last updated timestamps

#### Contact Support
- ✅ View contact information by type
- ✅ Edit contact details
- ✅ Submit support tickets
- ✅ See ticket creation confirmation

#### Help & Support
- ✅ Browse help articles by category
- ✅ Search FAQ items
- ✅ View FAQ engagement metrics
- ✅ Mark FAQs as helpful
- ✅ Edit help content

## 📊 Mock Data Included

### Legal Notices (3 items)
- Copyright Notice
- Legal Disclaimer  
- Governing Law

### Contact Support Info (4 items)
- Email Support
- Phone Support
- Live Chat
- Social Media

### Help Sections (3 items)
- Getting Started Guide
- Account Management
- Payment & Billing Guide

### FAQ Items (6 items)
- Campaign creation
- Platform fees
- Account verification
- Payment processing
- Password reset
- File format support

### Support Categories (5 items)
- Technical Issues
- Account Management
- Payment & Billing
- Campaign Support
- General Inquiry

### Support Tickets (3 sample tickets)
- Various statuses and priorities
- Sample responses
- Realistic timestamps

## 🔄 Switching to Real Supabase

When you're ready to use real Supabase:

1. **Run the database schema**:
   ```sql
   -- Execute: legal_support_supabase_tables.sql
   ```

2. **Update service imports**:
   ```typescript
   // Change from:
   import { mockLegalNoticesService } from '@/services/mockLegalSupportService';
   
   // To:
   import { legalNoticesService } from '@/services/legalSupportService';
   ```

3. **Update environment variables**:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   ```

## 🎯 Features Demonstrated

### Admin Panel Features
- ✅ **Content Management**: Edit legal notices, contact info, help sections
- ✅ **Real-time Updates**: Changes reflect immediately
- ✅ **Rich Text Editing**: HTML content editing with preview
- ✅ **Data Persistence**: Mock data persists during session

### User-Facing Features  
- ✅ **Search Functionality**: Search FAQs and help content
- ✅ **Category Filtering**: Filter content by categories
- ✅ **Interactive Elements**: FAQ helpful ratings, view counts
- ✅ **Support Tickets**: Create and track support requests
- ✅ **Responsive Design**: Works on all screen sizes

### Technical Features
- ✅ **TypeScript Types**: Full type safety
- ✅ **Error Handling**: Proper error messages and logging
- ✅ **Loading States**: Spinner indicators during operations
- ✅ **Async Operations**: Simulated network delays
- ✅ **Data Validation**: Form validation and error handling

## 🐛 Troubleshooting

### Common Issues

1. **Import Errors**
   ```typescript
   // Make sure you're importing from the correct file:
   import { mockLegalNoticesService } from '@/services/mockLegalSupportService';
   ```

2. **Type Errors**
   ```typescript
   // Ensure you're using the correct interfaces:
   import { LegalNotice, ContactSupportInfo } from '@/services/legalSupportService';
   ```

3. **Component Not Loading**
   - Check browser console for errors
   - Verify the route is properly configured
   - Ensure the component is exported correctly

### Debug Mode
Add console logging to see mock service calls:
```typescript
// In your component
console.log('Loading legal notices...');
const data = await mockLegalNoticesService.getAllNotices();
console.log('Loaded data:', data);
```

## 📈 Next Steps

1. **Test all features** thoroughly
2. **Customize mock data** for your specific needs
3. **Add more sample content** as needed
4. **Prepare for Supabase migration** when ready
5. **Deploy to staging** for team testing

## 🎉 Benefits of Mock Data

- ✅ **No Database Setup**: Start testing immediately
- ✅ **Consistent Data**: Same data every time
- ✅ **Fast Development**: No network dependencies
- ✅ **Easy Testing**: Predictable behavior
- ✅ **Team Collaboration**: Everyone has same data
- ✅ **Offline Development**: Works without internet

The mock data system provides a complete testing environment that mirrors the real Supabase functionality, allowing you to develop and test all features before database setup.
