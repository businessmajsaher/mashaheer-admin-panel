# Flutter Apps - Contract Loading from Backend Guide

## Problem
Flutter apps are not loading contracts from the backend. This guide provides step-by-step troubleshooting and implementation.

> **If your Flutter app is currently using local/mock data instead of the backend**, see **[FLUTTER_MIGRATE_LOCAL_TO_BACKEND.md](./FLUTTER_MIGRATE_LOCAL_TO_BACKEND.md)** for a step-by-step migration guide.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Common Issues](#common-issues)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Authentication Setup](#authentication-setup)
5. [API Endpoints](#api-endpoints)
6. [Testing & Debugging](#testing--debugging)
7. [Troubleshooting Checklist](#troubleshooting-checklist)

---

## Prerequisites

### 1. Required Dependencies

Add these to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # Supabase Flutter SDK (RECOMMENDED - handles auth automatically)
  supabase_flutter: ^2.5.6
  
  # OR use HTTP directly (requires manual auth handling)
  http: ^1.1.0
  
  # State management
  provider: ^6.1.1
  # OR
  bloc: ^8.1.2
  flutter_bloc: ^8.1.3
  
  # Local storage for auth tokens
  shared_preferences: ^2.2.2
  
  # JSON handling
  json_annotation: ^4.8.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  json_serializable: ^6.7.1
  build_runner: ^2.4.7
```

### 2. Supabase Configuration

Get these values from your Supabase dashboard:
- **Supabase URL**: `https://your-project.supabase.co`
- **Supabase Anon Key**: Found in Settings > API

---

## Common Issues

### Issue 1: Authentication Not Set Up
**Symptom**: Empty results or 401/403 errors

**Solution**: You MUST authenticate users before querying contracts. RLS policies require `auth.uid()` to match `customer_id` or `influencer_id`.

### Issue 2: Wrong API Endpoint
**Symptom**: 404 errors or wrong data structure

**Solution**: Use the correct Supabase REST API endpoints:
- Templates: `/rest/v1/contract_templates`
- Instances: `/rest/v1/contract_instances`

### Issue 3: Missing Authorization Headers
**Symptom**: 401 Unauthorized errors

**Solution**: Include the JWT token in the Authorization header.

### Issue 4: RLS Policy Blocking Access
**Symptom**: Empty results even with valid auth

**Solution**: Ensure the authenticated user's ID matches `customer_id` or `influencer_id` in the contract.

---

## Step-by-Step Implementation

### Method 1: Using Supabase Flutter SDK (RECOMMENDED)

This is the easiest and most reliable method as it handles authentication automatically.

#### Step 1: Initialize Supabase

Create `lib/config/supabase_config.dart`:

```dart
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

#### Step 2: Initialize in main.dart

```dart
import 'package:flutter/material.dart';
import 'config/supabase_config.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Supabase
  await SupabaseConfig.initialize();
  
  runApp(MyApp());
}
```

#### Step 3: Create Data Models

Create `lib/models/contract.dart`:

```dart
import 'package:json_annotation/json_annotation.dart';

part 'contract.g.dart';

@JsonSerializable()
class ContractTemplate {
  final String id;
  final String title;
  final String templateType;
  final String content;
  final List<String> variables;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  ContractTemplate({
    required this.id,
    required this.title,
    required this.templateType,
    required this.content,
    required this.variables,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ContractTemplate.fromJson(Map<String, dynamic> json) =>
      _$ContractTemplateFromJson(json);
  Map<String, dynamic> toJson() => _$ContractTemplateToJson(this);
}

@JsonSerializable()
class ContractInstance {
  final String id;
  @JsonKey(name: 'template_id')
  final String? templateId;
  @JsonKey(name: 'customer_id')
  final String customerId;
  @JsonKey(name: 'influencer_id')
  final String influencerId;
  @JsonKey(name: 'booking_id')
  final String? bookingId;
  final String status;
  @JsonKey(name: 'signed_at')
  final DateTime? signedAt;
  @JsonKey(name: 'completed_at')
  final DateTime? completedAt;
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  @JsonKey(name: 'variables')
  final Map<String, dynamic>? variables;
  @JsonKey(name: 'generated_content')
  final String? generatedContent;
  @JsonKey(name: 'expires_at')
  final DateTime? expiresAt;

  ContractInstance({
    required this.id,
    this.templateId,
    required this.customerId,
    required this.influencerId,
    this.bookingId,
    required this.status,
    this.signedAt,
    this.completedAt,
    required this.createdAt,
    this.variables,
    this.generatedContent,
    this.expiresAt,
  });

  factory ContractInstance.fromJson(Map<String, dynamic> json) =>
      _$ContractInstanceFromJson(json);
  Map<String, dynamic> toJson() => _$ContractInstanceToJson(this);
}
```

#### Step 4: Create Contract Service

Create `lib/services/contract_service.dart`:

```dart
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase_config.dart';
import '../models/contract.dart';

class ContractService {
  final SupabaseClient _supabase = SupabaseConfig.client;

  // Get contract templates (active only)
  Future<List<ContractTemplate>> getContractTemplates() async {
    try {
      final response = await _supabase
          .from('contract_templates')
          .select()
          .eq('is_active', true)
          .order('created_at', ascending: false);

      return (response as List)
          .map((json) => ContractTemplate.fromJson(json))
          .toList();
    } catch (e) {
      throw Exception('Error fetching contract templates: $e');
    }
  }

  // Get contract template by ID
  Future<ContractTemplate> getContractTemplate(String templateId) async {
    try {
      final response = await _supabase
          .from('contract_templates')
          .select()
          .eq('id', templateId)
          .single();

      return ContractTemplate.fromJson(response);
    } catch (e) {
      throw Exception('Error fetching contract template: $e');
    }
  }

  // Get contract instances for current user (influencer or customer)
  Future<List<ContractInstance>> getMyContracts() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) {
        throw Exception('User not authenticated');
      }

      final response = await _supabase
          .from('contract_instances')
          .select()
          .or('customer_id.eq.$userId,influencer_id.eq.$userId')
          .order('created_at', ascending: false);

      return (response as List)
          .map((json) => ContractInstance.fromJson(json))
          .toList();
    } catch (e) {
      throw Exception('Error fetching contracts: $e');
    }
  }

  // Get contract instances for a specific influencer
  Future<List<ContractInstance>> getInfluencerContracts(String influencerId) async {
    try {
      final response = await _supabase
          .from('contract_instances')
          .select()
          .eq('influencer_id', influencerId)
          .order('created_at', ascending: false);

      return (response as List)
          .map((json) => ContractInstance.fromJson(json))
          .toList();
    } catch (e) {
      throw Exception('Error fetching influencer contracts: $e');
    }
  }

  // Get contract instance by ID
  Future<ContractInstance> getContractInstance(String contractId) async {
    try {
      final response = await _supabase
          .from('contract_instances')
          .select()
          .eq('id', contractId)
          .single();

      return ContractInstance.fromJson(response);
    } catch (e) {
      throw Exception('Error fetching contract: $e');
    }
  }

  // Get contract with template details (joined query)
  Future<ContractInstance> getContractWithTemplate(String contractId) async {
    try {
      final response = await _supabase
          .from('contract_instances')
          .select('''
            *,
            contract_templates (
              id,
              title,
              template_type,
              content,
              variables
            )
          ''')
          .eq('id', contractId)
          .single();

      return ContractInstance.fromJson(response);
    } catch (e) {
      throw Exception('Error fetching contract with template: $e');
    }
  }

  // Sign a contract
  Future<void> signContract(String contractInstanceId) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) {
        throw Exception('User not authenticated');
      }

      // Update contract status
      await _supabase
          .from('contract_instances')
          .update({
            'status': 'signed',
            'signed_at': DateTime.now().toIso8601String(),
          })
          .eq('id', contractInstanceId);

      // Create signature record
      await _supabase
          .from('contract_signatures')
          .insert({
            'contract_instance_id': contractInstanceId,
            'signer_id': userId,
            'signer_type': 'influencer', // or 'customer' based on user role
            'signed_at': DateTime.now().toIso8601String(),
          });
    } catch (e) {
      throw Exception('Error signing contract: $e');
    }
  }

  // Update contract status
  Future<void> updateContractStatus(String contractId, String status) async {
    try {
      final updateData = {
        'status': status,
        'updated_at': DateTime.now().toIso8601String(),
      };

      if (status == 'signed') {
        updateData['signed_at'] = DateTime.now().toIso8601String();
      } else if (status == 'completed') {
        updateData['completed_at'] = DateTime.now().toIso8601String();
      }

      await _supabase
          .from('contract_instances')
          .update(updateData)
          .eq('id', contractId);
    } catch (e) {
      throw Exception('Error updating contract status: $e');
    }
  }
}
```

#### Step 5: Generate JSON Serialization

Run this command:

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

---

### Method 2: Using HTTP Directly (Manual Auth)

If you prefer using HTTP directly, you need to handle authentication manually.

#### Step 1: Create Supabase Config

Create `lib/config/supabase_config.dart`:

```dart
class SupabaseConfig {
  static const String supabaseUrl = 'YOUR_SUPABASE_URL';
  static const String supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
  
  static const String baseUrl = '$supabaseUrl/rest/v1';
  
  // Get headers with auth token
  static Map<String, String> getHeaders(String? accessToken) {
    final headers = {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
    
    if (accessToken != null) {
      headers['Authorization'] = 'Bearer $accessToken';
    } else {
      headers['Authorization'] = 'Bearer $supabaseAnonKey';
    }
    
    return headers;
  }
}
```

#### Step 2: Create Contract Service with HTTP

Create `lib/services/contract_service_http.dart`:

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/supabase_config.dart';
import '../models/contract.dart';

class ContractServiceHttp {
  // Get access token from storage (set after login)
  Future<String?> _getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('supabase_access_token');
  }

  // Get contract instances for current user
  Future<List<ContractInstance>> getMyContracts() async {
    try {
      final accessToken = await _getAccessToken();
      if (accessToken == null) {
        throw Exception('User not authenticated. Please login first.');
      }

      final userId = await _getUserId();
      if (userId == null) {
        throw Exception('User ID not found');
      }

      // Query contracts where user is customer OR influencer
      final url = Uri.parse(
        '${SupabaseConfig.baseUrl}/contract_instances?select=*&or=(customer_id.eq.$userId,influencer_id.eq.$userId)&order=created_at.desc'
      );

      final response = await http.get(
        url,
        headers: SupabaseConfig.getHeaders(accessToken),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => ContractInstance.fromJson(json)).toList();
      } else if (response.statusCode == 401) {
        throw Exception('Authentication failed. Please login again.');
      } else if (response.statusCode == 403) {
        throw Exception('Access denied. Check RLS policies.');
      } else {
        throw Exception('Failed to load contracts: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('Error fetching contracts: $e');
    }
  }

  // Get contract instances for a specific influencer
  Future<List<ContractInstance>> getInfluencerContracts(String influencerId) async {
    try {
      final accessToken = await _getAccessToken();
      if (accessToken == null) {
        throw Exception('User not authenticated');
      }

      final url = Uri.parse(
        '${SupabaseConfig.baseUrl}/contract_instances?select=*&influencer_id=eq.$influencerId&order=created_at.desc'
      );

      final response = await http.get(
        url,
        headers: SupabaseConfig.getHeaders(accessToken),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => ContractInstance.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load contracts: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('Error fetching contracts: $e');
    }
  }

  // Get contract instance by ID
  Future<ContractInstance> getContractInstance(String contractId) async {
    try {
      final accessToken = await _getAccessToken();
      if (accessToken == null) {
        throw Exception('User not authenticated');
      }

      final url = Uri.parse(
        '${SupabaseConfig.baseUrl}/contract_instances?select=*&id=eq.$contractId'
      );

      final response = await http.get(
        url,
        headers: SupabaseConfig.getHeaders(accessToken),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        if (data.isNotEmpty) {
          return ContractInstance.fromJson(data.first);
        } else {
          throw Exception('Contract not found');
        }
      } else {
        throw Exception('Failed to load contract: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching contract: $e');
    }
  }

  // Get contract templates
  Future<List<ContractTemplate>> getContractTemplates() async {
    try {
      final accessToken = await _getAccessToken();
      
      final url = Uri.parse(
        '${SupabaseConfig.baseUrl}/contract_templates?select=*&is_active=eq.true&order=created_at.desc'
      );

      final response = await http.get(
        url,
        headers: SupabaseConfig.getHeaders(accessToken),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => ContractTemplate.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load templates: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching templates: $e');
    }
  }

  // Helper to get user ID from storage
  Future<String?> _getUserId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('user_id');
  }
}
```

---

## Authentication Setup

### Critical: You MUST Authenticate Users First

Contracts are protected by Row Level Security (RLS). Users can only see contracts where they are the `customer_id` or `influencer_id`.

#### Using Supabase Flutter SDK:

```dart
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase_config.dart';

// Sign in user
Future<void> signIn(String email, String password) async {
  final response = await SupabaseConfig.client.auth.signInWithPassword(
    email: email,
    password: password,
  );
  
  if (response.user != null) {
    // User is now authenticated
    // All subsequent queries will include the auth token automatically
  }
}

// Sign up user
Future<void> signUp(String email, String password) async {
  await SupabaseConfig.client.auth.signUp(
    email: email,
    password: password,
  );
}

// Get current user
User? getCurrentUser() {
  return SupabaseConfig.client.auth.currentUser;
}

// Sign out
Future<void> signOut() async {
  await SupabaseConfig.client.auth.signOut();
}
```

#### Using HTTP Directly:

After login, store the access token:

```dart
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

Future<void> signInAndStoreToken(String email, String password) async {
  final response = await http.post(
    Uri.parse('${SupabaseConfig.supabaseUrl}/auth/v1/token?grant_type=password'),
    headers: {
      'apikey': SupabaseConfig.supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: json.encode({
      'email': email,
      'password': password,
    }),
  );

  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    final accessToken = data['access_token'];
    final userId = data['user']['id'];
    
    // Store tokens
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('supabase_access_token', accessToken);
    await prefs.setString('user_id', userId);
  }
}
```

---

## API Endpoints

### Base URL
```
https://your-project.supabase.co/rest/v1
```

### Contract Instances

**Get all contracts for current user:**
```
GET /contract_instances?select=*&or=(customer_id.eq.USER_ID,influencer_id.eq.USER_ID)&order=created_at.desc
```

**Get contracts for specific influencer:**
```
GET /contract_instances?select=*&influencer_id=eq.INFLUENCER_ID&order=created_at.desc
```

**Get single contract:**
```
GET /contract_instances?select=*&id=eq.CONTRACT_ID
```

**Get contract with template (joined):**
```
GET /contract_instances?select=*,contract_templates(*)&id=eq.CONTRACT_ID
```

### Contract Templates

**Get all active templates:**
```
GET /contract_templates?select=*&is_active=eq.true&order=created_at.desc
```

**Get template by ID:**
```
GET /contract_templates?select=*&id=eq.TEMPLATE_ID
```

### Headers Required

```dart
{
  'apikey': 'YOUR_ANON_KEY',
  'Authorization': 'Bearer ACCESS_TOKEN', // From authenticated user
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
}
```

---

## Testing & Debugging

### Step 1: Verify Authentication

```dart
// Check if user is authenticated
void checkAuth() {
  final user = SupabaseConfig.client.auth.currentUser;
  if (user == null) {
    print('❌ User not authenticated');
  } else {
    print('✅ User authenticated: ${user.id}');
    print('   Email: ${user.email}');
  }
}
```

### Step 2: Test Contract Loading

```dart
Future<void> testLoadContracts() async {
  try {
    final service = ContractService();
    
    print('Loading contracts...');
    final contracts = await service.getMyContracts();
    
    print('✅ Loaded ${contracts.length} contracts');
    for (var contract in contracts) {
      print('  - Contract ${contract.id}: ${contract.status}');
    }
  } catch (e) {
    print('❌ Error: $e');
  }
}
```

### Step 3: Check RLS Policies

Run this SQL in Supabase SQL Editor to verify RLS:

```sql
-- Check if user can see contracts
SELECT 
  ci.id,
  ci.status,
  ci.customer_id,
  ci.influencer_id,
  auth.uid() as current_user_id
FROM contract_instances ci
WHERE ci.customer_id = auth.uid() 
   OR ci.influencer_id = auth.uid();
```

### Step 4: Enable Debug Logging

```dart
// In your service, add logging
Future<List<ContractInstance>> getMyContracts() async {
  try {
    final userId = _supabase.auth.currentUser?.id;
    print('🔍 Fetching contracts for user: $userId');
    
    final response = await _supabase
        .from('contract_instances')
        .select()
        .or('customer_id.eq.$userId,influencer_id.eq.$userId');
    
    print('✅ Received ${response.length} contracts');
    return (response as List)
        .map((json) => ContractInstance.fromJson(json))
        .toList();
  } catch (e) {
    print('❌ Error: $e');
    rethrow;
  }
}
```

---

## Troubleshooting Checklist

### ✅ Authentication Issues

- [ ] User is logged in (check `auth.currentUser`)
- [ ] Access token is included in request headers
- [ ] Token hasn't expired (Supabase tokens expire after 1 hour)
- [ ] User ID matches `customer_id` or `influencer_id` in contracts

### ✅ API Endpoint Issues

- [ ] Correct base URL: `https://your-project.supabase.co/rest/v1`
- [ ] Table name is correct: `contract_instances` (not `contracts`)
- [ ] Query parameters are properly formatted
- [ ] Using POSTMAN/curl to test endpoints directly

### ✅ RLS Policy Issues

- [ ] RLS is enabled on `contract_instances` table
- [ ] User has SELECT policy for their own contracts
- [ ] User ID in auth matches contract `customer_id` or `influencer_id`
- [ ] Test query in Supabase SQL Editor with `auth.uid()`

### ✅ Data Issues

- [ ] Contracts exist in database
- [ ] Contracts have correct `customer_id` or `influencer_id`
- [ ] Contract status is not filtering out results
- [ ] Check database directly: `SELECT * FROM contract_instances;`

### ✅ Code Issues

- [ ] JSON serialization generated (`build_runner`)
- [ ] Model field names match database columns (snake_case)
- [ ] Error handling catches and displays errors
- [ ] Loading states are shown to user

---

## Common Error Messages & Solutions

### Error: "User not authenticated"
**Solution**: Call `signIn()` or `signUp()` before loading contracts.

### Error: "Access denied" or 403
**Solution**: Check RLS policies. User must be `customer_id` or `influencer_id` in the contract.

### Error: "Contract not found"
**Solution**: 
- Verify contract exists in database
- Check if user has permission to view it
- Verify contract ID is correct

### Error: Empty results but contracts exist
**Solution**:
- Check if user ID matches contract's `customer_id` or `influencer_id`
- Verify RLS policies allow SELECT
- Test query directly in Supabase SQL Editor

### Error: "Failed to load contracts: 401"
**Solution**: 
- Token expired - re-authenticate user
- Missing Authorization header
- Invalid access token

---

## Example: Complete Working Implementation

### 1. Provider Setup

```dart
// lib/providers/contract_provider.dart
import 'package:flutter/foundation.dart';
import '../services/contract_service.dart';
import '../models/contract.dart';

class ContractProvider with ChangeNotifier {
  final ContractService _service = ContractService();
  
  List<ContractInstance> _contracts = [];
  bool _isLoading = false;
  String? _error;

  List<ContractInstance> get contracts => _contracts;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadContracts() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _contracts = await _service.getMyContracts();
      _error = null;
    } catch (e) {
      _error = e.toString();
      print('Error loading contracts: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
```

### 2. UI Screen

```dart
// lib/screens/contracts_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/contract_provider.dart';

class ContractsScreen extends StatefulWidget {
  @override
  _ContractsScreenState createState() => _ContractsScreenState();
}

class _ContractsScreenState extends State<ContractsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ContractProvider>().loadContracts();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('My Contracts')),
      body: Consumer<ContractProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading) {
            return Center(child: CircularProgressIndicator());
          }

          if (provider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Error: ${provider.error}'),
                  ElevatedButton(
                    onPressed: () => provider.loadContracts(),
                    child: Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (provider.contracts.isEmpty) {
            return Center(child: Text('No contracts found'));
          }

          return RefreshIndicator(
            onRefresh: () => provider.loadContracts(),
            child: ListView.builder(
              itemCount: provider.contracts.length,
              itemBuilder: (context, index) {
                final contract = provider.contracts[index];
                return ListTile(
                  title: Text('Contract ${contract.id.substring(0, 8)}'),
                  subtitle: Text('Status: ${contract.status}'),
                  trailing: Chip(label: Text(contract.status)),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
```

---

## Next Steps

1. **Implement authentication** if not already done
2. **Test with a known contract** in your database
3. **Check RLS policies** in Supabase dashboard
4. **Add error handling** and user feedback
5. **Implement contract detail view** and signing functionality

---

## Support

If contracts still don't load after following this guide:

1. Check Supabase logs: Dashboard > Logs > API Logs
2. Test query directly in Supabase SQL Editor
3. Verify user authentication in Supabase Dashboard > Authentication
4. Check RLS policies: Dashboard > Table Editor > contract_instances > RLS Policies

---

**Last Updated**: Based on contract schema and RLS policies as of latest migration.

