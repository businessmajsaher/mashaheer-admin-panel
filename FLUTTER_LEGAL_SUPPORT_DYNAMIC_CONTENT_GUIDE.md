# Flutter Apps - Legal, Help, and Support Dynamic Content Guide

## Problem

The Flutter apps currently show hardcoded content for:

- Legal notices
- Help and support
- Contact support

This content should be loaded from Supabase tables so the admin panel can update it without publishing a new app build.

## Existing Backend Tables

The project already has SQL for these tables in `legal_support_supabase_tables.sql`.

| App Screen | Table | Purpose |
| --- | --- | --- |
| Legal Notices | `legal_notices` | Privacy, terms, copyright, disclaimers, legal pages |
| Contact Support | `contact_support_info` | Email, phone, chat, business hours, social links |
| Help and Support | `help_sections` | Help articles and guide sections |
| FAQ | `faq_items` | Searchable questions and answers |
| Support Ticket Form | `support_tickets` | User-created support requests |

## Required Flutter Dependencies

Add these dependencies to each Flutter app that needs dynamic content:

```yaml
dependencies:
  supabase_flutter: ^2.5.6
  flutter_html: ^3.0.0-beta.2
```

Use `flutter_html` only if the app will render HTML stored in the `content` or `answer` fields. If you convert stored content to plain text later, regular `Text` widgets are enough.

## Supabase Initialization

Create or reuse the app's Supabase config:

```dart
// lib/config/supabase_config.dart
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseConfig {
  static const String supabaseUrl = 'YOUR_SUPABASE_URL';
  static const String supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

  static Future<void> initialize() async {
    await Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    );
  }

  static SupabaseClient get client => Supabase.instance.client;
}
```

Initialize before `runApp`:

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SupabaseConfig.initialize();
  runApp(const MyApp());
}
```

## Data Models

Create models for the content tables:

```dart
// lib/models/legal_support_models.dart
class LegalNotice {
  final String id;
  final String title;
  final String content;
  final String category;
  final bool isActive;
  final int version;
  final DateTime? lastUpdated;

  LegalNotice({
    required this.id,
    required this.title,
    required this.content,
    required this.category,
    required this.isActive,
    required this.version,
    this.lastUpdated,
  });

  factory LegalNotice.fromJson(Map<String, dynamic> json) {
    return LegalNotice(
      id: json['id'] as String,
      title: json['title'] as String,
      content: json['content'] as String,
      category: json['category'] as String,
      isActive: json['is_active'] as bool? ?? true,
      version: json['version'] as int? ?? 1,
      lastUpdated: json['last_updated'] == null
          ? null
          : DateTime.parse(json['last_updated'] as String),
    );
  }
}

class ContactSupportInfo {
  final String id;
  final String title;
  final String content;
  final String contactType;
  final int priority;
  final bool isActive;

  ContactSupportInfo({
    required this.id,
    required this.title,
    required this.content,
    required this.contactType,
    required this.priority,
    required this.isActive,
  });

  factory ContactSupportInfo.fromJson(Map<String, dynamic> json) {
    return ContactSupportInfo(
      id: json['id'] as String,
      title: json['title'] as String,
      content: json['content'] as String,
      contactType: json['contact_type'] as String,
      priority: json['priority'] as int? ?? 1,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}

class HelpSection {
  final String id;
  final String title;
  final String content;
  final String category;
  final int orderIndex;
  final bool isActive;

  HelpSection({
    required this.id,
    required this.title,
    required this.content,
    required this.category,
    required this.orderIndex,
    required this.isActive,
  });

  factory HelpSection.fromJson(Map<String, dynamic> json) {
    return HelpSection(
      id: json['id'] as String,
      title: json['title'] as String,
      content: json['content'] as String,
      category: json['category'] as String,
      orderIndex: json['order_index'] as int? ?? 0,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}

class FaqItem {
  final String id;
  final String question;
  final String answer;
  final String category;
  final List<String> tags;
  final int orderIndex;
  final int viewCount;
  final int helpfulCount;
  final bool isActive;

  FaqItem({
    required this.id,
    required this.question,
    required this.answer,
    required this.category,
    required this.tags,
    required this.orderIndex,
    required this.viewCount,
    required this.helpfulCount,
    required this.isActive,
  });

  factory FaqItem.fromJson(Map<String, dynamic> json) {
    return FaqItem(
      id: json['id'] as String,
      question: json['question'] as String,
      answer: json['answer'] as String,
      category: json['category'] as String,
      tags: List<String>.from(json['tags'] as List? ?? const []),
      orderIndex: json['order_index'] as int? ?? 0,
      viewCount: json['view_count'] as int? ?? 0,
      helpfulCount: json['helpful_count'] as int? ?? 0,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}
```

## Supabase Service

Add one service that all three screens can use:

```dart
// lib/services/legal_support_service.dart
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase_config.dart';
import '../models/legal_support_models.dart';

class LegalSupportService {
  final SupabaseClient _supabase = SupabaseConfig.client;

  Future<List<LegalNotice>> getActiveLegalNotices() async {
    final response = await _supabase
        .from('legal_notices')
        .select()
        .eq('is_active', true)
        .order('category', ascending: true);

    return (response as List)
        .map((json) => LegalNotice.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<List<LegalNotice>> getLegalNoticesByCategory(String category) async {
    final response = await _supabase
        .from('legal_notices')
        .select()
        .eq('is_active', true)
        .eq('category', category)
        .order('last_updated', ascending: false);

    return (response as List)
        .map((json) => LegalNotice.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<List<ContactSupportInfo>> getActiveContactSupportInfo() async {
    final response = await _supabase
        .from('contact_support_info')
        .select()
        .eq('is_active', true)
        .order('priority', ascending: true);

    return (response as List)
        .map((json) => ContactSupportInfo.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<List<HelpSection>> getActiveHelpSections() async {
    final response = await _supabase
        .from('help_sections')
        .select()
        .eq('is_active', true)
        .order('order_index', ascending: true);

    return (response as List)
        .map((json) => HelpSection.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<List<FaqItem>> getActiveFaqs() async {
    final response = await _supabase
        .from('faq_items')
        .select()
        .eq('is_active', true)
        .order('order_index', ascending: true);

    return (response as List)
        .map((json) => FaqItem.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<List<FaqItem>> searchFaqs(String query) async {
    final trimmedQuery = query.trim();
    if (trimmedQuery.isEmpty) {
      return getActiveFaqs();
    }

    final response = await _supabase
        .from('faq_items')
        .select()
        .eq('is_active', true)
        .or('question.ilike.%$trimmedQuery%,answer.ilike.%$trimmedQuery%')
        .order('helpful_count', ascending: false);

    return (response as List)
        .map((json) => FaqItem.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<void> createSupportTicket({
    required String subject,
    required String message,
    required String category,
    String priority = 'medium',
  }) async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) {
      throw StateError('User must be signed in to create a support ticket.');
    }

    await _supabase.from('support_tickets').insert({
      'user_id': userId,
      'subject': subject,
      'message': message,
      'category': category,
      'priority': priority,
      'status': 'open',
    });
  }
}
```

## Screen Replacement Mapping

Replace hardcoded values with service calls as follows:

| Current Hardcoded Screen | New Query |
| --- | --- |
| Legal notices list/detail | `getActiveLegalNotices()` or `getLegalNoticesByCategory(category)` |
| Terms of service | `getLegalNoticesByCategory('terms-of-service')` |
| Privacy policy | `getLegalNoticesByCategory('privacy-policy')` if that category exists |
| Contact support info cards | `getActiveContactSupportInfo()` |
| Help articles | `getActiveHelpSections()` |
| FAQs | `getActiveFaqs()` and `searchFaqs(query)` |
| Contact support form submit | `createSupportTicket(...)` |

## Legal Notices Screen Example

```dart
import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import '../models/legal_support_models.dart';
import '../services/legal_support_service.dart';

class LegalNoticesScreen extends StatefulWidget {
  const LegalNoticesScreen({super.key});

  @override
  State<LegalNoticesScreen> createState() => _LegalNoticesScreenState();
}

class _LegalNoticesScreenState extends State<LegalNoticesScreen> {
  final LegalSupportService _service = LegalSupportService();
  late Future<List<LegalNotice>> _future;

  @override
  void initState() {
    super.initState();
    _future = _service.getActiveLegalNotices();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Legal Notices')),
      body: FutureBuilder<List<LegalNotice>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(child: Text('Failed to load legal notices'));
          }

          final notices = snapshot.data ?? [];
          if (notices.isEmpty) {
            return const Center(child: Text('No legal notices available'));
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: notices.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final notice = notices[index];
              return Card(
                child: ExpansionTile(
                  title: Text(notice.title),
                  subtitle: Text(notice.category),
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Html(data: notice.content),
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}
```

## Contact Support Screen Example

```dart
import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import '../models/legal_support_models.dart';
import '../services/legal_support_service.dart';

class ContactSupportScreen extends StatefulWidget {
  const ContactSupportScreen({super.key});

  @override
  State<ContactSupportScreen> createState() => _ContactSupportScreenState();
}

class _ContactSupportScreenState extends State<ContactSupportScreen> {
  final LegalSupportService _service = LegalSupportService();
  late Future<List<ContactSupportInfo>> _future;

  @override
  void initState() {
    super.initState();
    _future = _service.getActiveContactSupportInfo();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Contact Support')),
      body: FutureBuilder<List<ContactSupportInfo>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return const Center(child: Text('Failed to load support info'));
          }

          final contactItems = snapshot.data ?? [];
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: contactItems.length,
            itemBuilder: (context, index) {
              final item = contactItems[index];
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Html(data: item.content),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
```

## Help and FAQ Screen Example

```dart
import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import '../models/legal_support_models.dart';
import '../services/legal_support_service.dart';

class HelpSupportScreen extends StatefulWidget {
  const HelpSupportScreen({super.key});

  @override
  State<HelpSupportScreen> createState() => _HelpSupportScreenState();
}

class _HelpSupportScreenState extends State<HelpSupportScreen> {
  final LegalSupportService _service = LegalSupportService();
  final TextEditingController _searchController = TextEditingController();

  late Future<List<HelpSection>> _sectionsFuture;
  late Future<List<FaqItem>> _faqsFuture;

  @override
  void initState() {
    super.initState();
    _sectionsFuture = _service.getActiveHelpSections();
    _faqsFuture = _service.getActiveFaqs();
  }

  void _searchFaqs() {
    setState(() {
      _faqsFuture = _service.searchFaqs(_searchController.text);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Help & Support')),
      body: RefreshIndicator(
        onRefresh: () async {
          setState(() {
            _sectionsFuture = _service.getActiveHelpSections();
            _faqsFuture = _service.getActiveFaqs();
          });
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search FAQs',
                suffixIcon: IconButton(
                  icon: const Icon(Icons.search),
                  onPressed: _searchFaqs,
                ),
              ),
              onSubmitted: (_) => _searchFaqs(),
            ),
            const SizedBox(height: 24),
            FutureBuilder<List<HelpSection>>(
              future: _sectionsFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (snapshot.hasError) {
                  return const Text('Failed to load help articles');
                }

                final sections = snapshot.data ?? [];
                return Column(
                  children: sections.map((section) {
                    return Card(
                      child: ExpansionTile(
                        title: Text(section.title),
                        children: [
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: Html(data: section.content),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                );
              },
            ),
            const SizedBox(height: 24),
            Text('FAQs', style: Theme.of(context).textTheme.titleLarge),
            FutureBuilder<List<FaqItem>>(
              future: _faqsFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (snapshot.hasError) {
                  return const Text('Failed to load FAQs');
                }

                final faqs = snapshot.data ?? [];
                return Column(
                  children: faqs.map((faq) {
                    return Card(
                      child: ExpansionTile(
                        title: Text(faq.question),
                        children: [
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: Html(data: faq.answer),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
```

## Support Ticket Form Example

```dart
Future<void> submitSupportTicket() async {
  try {
    await LegalSupportService().createSupportTicket(
      subject: subjectController.text.trim(),
      message: messageController.text.trim(),
      category: selectedCategory,
      priority: selectedPriority,
    );

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Support ticket created')),
    );
  } catch (error) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Failed to create ticket: $error')),
    );
  }
}
```

## RLS and Authentication Notes

Public read content should work with the anon key:

- `legal_notices`: public read where `is_active = true`
- `contact_support_info`: public read where `is_active = true`
- `help_sections`: public read where `is_active = true`
- `faq_items`: public read where `is_active = true`
- `support_categories`: public read where `is_active = true`

Support ticket creation requires a signed-in user because `support_tickets.user_id` must match `auth.uid()`.

If the app gets empty results:

1. Confirm the table has active records.
2. Confirm the RLS public read policies exist.
3. Confirm the Flutter app is using the correct Supabase URL and anon key.
4. Test the same query in Supabase SQL Editor.

## Migration Checklist

Use this checklist in each Flutter app:

- [ ] Add `supabase_flutter` and initialize Supabase.
- [ ] Add `flutter_html` if rendering stored HTML.
- [ ] Add `LegalNotice`, `ContactSupportInfo`, `HelpSection`, and `FaqItem` models.
- [ ] Add `LegalSupportService`.
- [ ] Replace hardcoded legal notices with `getActiveLegalNotices()`.
- [ ] Replace hardcoded contact support content with `getActiveContactSupportInfo()`.
- [ ] Replace hardcoded help content with `getActiveHelpSections()`.
- [ ] Replace hardcoded FAQ content with `getActiveFaqs()` and `searchFaqs(query)`.
- [ ] Submit support requests into `support_tickets`.
- [ ] Add loading, empty, and error states.
- [ ] Verify changes made in the admin panel appear in the Flutter app without a rebuild.

## Admin Content Flow

After this migration, content updates should follow this flow:

1. Admin edits content in the React admin panel.
2. Admin panel writes to the Supabase table.
3. Flutter app reads active rows from Supabase.
4. Updated content appears on refresh or next screen load.

No hardcoded text should remain for legal, help, FAQ, or contact support content except fallback loading/error messages.

