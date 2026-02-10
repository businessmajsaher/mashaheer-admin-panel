# Switch from Mock to Real Supabase Service

Now that your database tables are created and populated, follow these steps to switch from mock data to real Supabase:

## 🔄 Step 1: Update Service Imports

### Legal Notices Component
```typescript
// In: src/pages/LegalNotices/LegalNotices.tsx
// Change this line:
import { mockLegalNoticesService, LegalNotice } from '@/services/mockLegalSupportService';

// To this:
import { legalNoticesService, LegalNotice } from '@/services/legalSupportService';
```

### Contact Support Component
```typescript
// In: src/pages/ContactSupport/ContactSupport.tsx
// Change this line:
import { mockContactSupportService, mockSupportTicketsService, ContactSupportInfo } from '@/services/mockLegalSupportService';

// To this:
import { contactSupportService, supportTicketsService, ContactSupportInfo } from '@/services/legalSupportService';
```

### Help Support Component
```typescript
// In: src/pages/HelpSupport/HelpSupport.tsx
// Change this line:
import { mockHelpSupportService, mockFaqService, HelpSection, FAQItem } from '@/services/mockLegalSupportService';

// To this:
import { helpSupportService, faqService, HelpSection, FAQItem } from '@/services/legalSupportService';
```

## 🔄 Step 2: Update Service Function Calls

### In Legal Notices Component
```typescript
// Replace all instances of:
mockLegalNoticesService.getAllNotices()
mockLegalNoticesService.updateNotice()

// With:
legalNoticesService.getAllNotices()
legalNoticesService.updateNotice()
```

### In Contact Support Component
```typescript
// Replace all instances of:
mockContactSupportService.getAllContactInfo()
mockContactSupportService.updateContactInfo()
mockSupportTicketsService.createTicket()

// With:
contactSupportService.getAllContactInfo()
contactSupportService.updateContactInfo()
supportTicketsService.createTicket()
```

### In Help Support Component
```typescript
// Replace all instances of:
mockHelpSupportService.getActiveHelpSections()
mockFaqService.getActiveFAQs()
mockFaqService.searchFAQs()
mockFaqService.incrementFAQView()
mockFaqService.incrementFAQHelpful()

// With:
helpSupportService.getActiveHelpSections()
faqService.getActiveFAQs()
faqService.searchFAQs()
faqService.incrementFAQView()
faqService.incrementFAQHelpful()
```

## 🔄 Step 3: Update Environment Variables

Make sure your `.env` file has the correct Supabase credentials:

```env
VITE_SUPABASE_URL=your_actual_supabase_url
VITE_SUPABASE_ANON_KEY=your_actual_supabase_anon_key
```

## 🔄 Step 4: Test the Connection

1. Start your development server: `npm run dev`
2. Navigate to each page and verify data loads from Supabase
3. Test editing functionality
4. Check browser console for any errors

## ✅ Verification Checklist

- [ ] Legal notices load from database
- [ ] Contact support info displays correctly
- [ ] Help sections and FAQs load properly
- [ ] Search functionality works
- [ ] Editing and saving works
- [ ] Support ticket creation works
- [ ] No console errors

## 🎉 You're Done!

Your Legal & Support system is now fully connected to Supabase with real data persistence!
