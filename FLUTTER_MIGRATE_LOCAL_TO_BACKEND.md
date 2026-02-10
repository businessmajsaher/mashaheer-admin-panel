# Flutter Apps: Migrating Contracts from Local/Mock Data to Backend

## Problem
Flutter apps are currently loading contracts from local storage, mock data, or hardcoded values instead of fetching from the Supabase backend.

## Quick Migration Guide

This guide shows you how to replace local/mock contract data with real backend API calls.

---

## Step 1: Identify Local/Mock Data Usage

### Common Patterns to Look For:

1. **Hardcoded Lists:**
```dart
// ❌ BAD - Hardcoded data
final List<Contract> contracts = [
  Contract(id: '1', title: 'Contract 1', ...),
  Contract(id: '2', title: 'Contract 2', ...),
];
```

2. **Local JSON Files:**
```dart
// ❌ BAD - Loading from assets
final String jsonString = await rootBundle.loadString('assets/contracts.json');
final List<Contract> contracts = (json.decode(jsonString) as List)
    .map((json) => Contract.fromJson(json))
    .toList();
```

3. **SharedPreferences (Cached Data Only):**
```dart
// ❌ BAD - Only reading from cache, no backend call
final prefs = await SharedPreferences.getInstance();
final String? contractsJson = prefs.getString('contracts');
if (contractsJson != null) {
  // Using cached data only
}
```

4. **Mock Service Classes:**
```dart
// ❌ BAD - Mock service returning fake data
class MockContractService {
  Future<List<Contract>> getContracts() async {
    await Future.delayed(Duration(seconds: 1)); // Fake delay
    return [
      Contract(id: '1', title: 'Mock Contract', ...),
    ];
  }
}
```

---

## Step 2: Replace with Backend Service

### Option A: Using Supabase Flutter SDK (RECOMMENDED)

#### 1. Add Dependencies

```yaml
# pubspec.yaml
dependencies:
  supabase_flutter: ^2.5.6
  provider: ^6.1.1  # or your state management solution
```

#### 2. Initialize Supabase

```dart
// lib/main.dart
import 'package:supabase_flutter/supabase_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Supabase.initialize(
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
  );
  
  runApp(MyApp());
}
```

#### 3. Create Backend Service

Replace your mock/local service with this:

```dart
// lib/services/contract_service.dart
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/contract.dart';

class ContractService {
  final SupabaseClient _supabase = Supabase.instance.client;

  // Replace local data loading with this
  Future<List<ContractInstance>> getMyContracts() async {
    try {
      // Check authentication first
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) {
        throw Exception('User not authenticated. Please login first.');
      }

      // Fetch from backend
      final response = await _supabase
          .from('contract_instances')
          .select()
          .or('customer_id.eq.$userId,influencer_id.eq.$userId')
          .order('created_at', ascending: false);

      return (response as List)
          .map((json) => ContractInstance.fromJson(json))
          .toList();
    } catch (e) {
      print('Error loading contracts: $e');
      rethrow;
    }
  }

  // Get contract templates
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
      print('Error loading templates: $e');
      rethrow;
    }
  }

  // Get single contract
  Future<ContractInstance> getContractById(String contractId) async {
    try {
      final response = await _supabase
          .from('contract_instances')
          .select()
          .eq('id', contractId)
          .single();

      return ContractInstance.fromJson(response);
    } catch (e) {
      print('Error loading contract: $e');
      rethrow;
    }
  }
}
```

---

## Step 3: Update Your Provider/State Management

### Before (Using Local Data):

```dart
// ❌ OLD - Using local/mock data
class ContractProvider with ChangeNotifier {
  List<Contract> _contracts = [];
  
  ContractProvider() {
    _loadLocalContracts();
  }
  
  void _loadLocalContracts() {
    // Loading from local source
    _contracts = [
      Contract(id: '1', title: 'Local Contract', ...),
    ];
    notifyListeners();
  }
}
```

### After (Using Backend):

```dart
// ✅ NEW - Using backend API
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
      print('Error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
```

---

## Step 4: Update UI Components

### Before (Static Local Data):

```dart
// ❌ OLD - Using hardcoded data
class ContractsScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final contracts = [
      Contract(id: '1', title: 'Contract 1'),
      Contract(id: '2', title: 'Contract 2'),
    ];
    
    return ListView.builder(
      itemCount: contracts.length,
      itemBuilder: (context, index) {
        return ListTile(title: Text(contracts[index].title));
      },
    );
  }
}
```

### After (Dynamic Backend Data):

```dart
// ✅ NEW - Loading from backend
class ContractsScreen extends StatefulWidget {
  @override
  _ContractsScreenState createState() => _ContractsScreenState();
}

class _ContractsScreenState extends State<ContractsScreen> {
  @override
  void initState() {
    super.initState();
    // Load from backend when screen opens
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
          // Show loading state
          if (provider.isLoading) {
            return Center(child: CircularProgressIndicator());
          }

          // Show error state
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

          // Show empty state
          if (provider.contracts.isEmpty) {
            return Center(
              child: Text('No contracts found'),
            );
          }

          // Show contracts list
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

## Step 5: Handle Authentication

**CRITICAL**: Contracts require authentication. Users can only see contracts where they are the `customer_id` or `influencer_id`.

### Add Authentication Check:

```dart
// lib/services/contract_service.dart
Future<List<ContractInstance>> getMyContracts() async {
  // Check if user is authenticated
  final userId = _supabase.auth.currentUser?.id;
  if (userId == null) {
    throw Exception('User not authenticated. Please login first.');
  }
  
  // Now fetch contracts
  // ...
}
```

### Add Login Screen (if not exists):

```dart
// lib/screens/login_screen.dart
class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;

  Future<void> _login() async {
    setState(() => _isLoading = true);
    
    try {
      await Supabase.instance.client.auth.signInWithPassword(
        email: _emailController.text,
        password: _passwordController.text,
      );
      
      // Navigate to contracts screen after login
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => ContractsScreen()),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Login failed: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Login')),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _emailController,
              decoration: InputDecoration(labelText: 'Email'),
            ),
            TextField(
              controller: _passwordController,
              decoration: InputDecoration(labelText: 'Password'),
              obscureText: true,
            ),
            SizedBox(height: 16),
            ElevatedButton(
              onPressed: _isLoading ? null : _login,
              child: _isLoading 
                ? CircularProgressIndicator() 
                : Text('Login'),
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## Step 6: Migration Checklist

### Find and Replace:

- [ ] **Search for hardcoded contract lists** - Replace with API calls
- [ ] **Find mock service classes** - Replace with real `ContractService`
- [ ] **Check for local JSON files** - Remove asset loading, use backend
- [ ] **Update providers/state management** - Add loading and error states
- [ ] **Update UI components** - Add loading indicators and error handling
- [ ] **Add authentication** - Ensure users are logged in before loading contracts
- [ ] **Test with real data** - Verify contracts load from backend
- [ ] **Handle empty states** - Show message when no contracts exist
- [ ] **Add pull-to-refresh** - Allow users to reload contracts
- [ ] **Add error handling** - Show user-friendly error messages

---

## Common Migration Patterns

### Pattern 1: Replacing Static List

**Before:**
```dart
final contracts = [
  Contract(id: '1', ...),
  Contract(id: '2', ...),
];
```

**After:**
```dart
final contracts = await contractService.getMyContracts();
```

### Pattern 2: Replacing Local JSON

**Before:**
```dart
final jsonString = await rootBundle.loadString('assets/contracts.json');
final contracts = parseContracts(jsonString);
```

**After:**
```dart
final contracts = await contractService.getMyContracts();
```

### Pattern 3: Replacing Mock Service

**Before:**
```dart
class MockContractService {
  Future<List<Contract>> getContracts() async {
    return [/* mock data */];
  }
}
```

**After:**
```dart
class ContractService {
  final SupabaseClient _supabase = Supabase.instance.client;
  
  Future<List<ContractInstance>> getMyContracts() async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) throw Exception('Not authenticated');
    
    final response = await _supabase
        .from('contract_instances')
        .select()
        .or('customer_id.eq.$userId,influencer_id.eq.$userId');
    
    return (response as List)
        .map((json) => ContractInstance.fromJson(json))
        .toList();
  }
}
```

### Pattern 4: Adding Loading States

**Before:**
```dart
Widget build(BuildContext context) {
  final contracts = getLocalContracts(); // Instant
  return ListView(...);
}
```

**After:**
```dart
Widget build(BuildContext context) {
  return Consumer<ContractProvider>(
    builder: (context, provider, child) {
      if (provider.isLoading) {
        return CircularProgressIndicator();
      }
      return ListView(...);
    },
  );
}
```

---

## Complete Example: Before & After

### Before (Local Data):

```dart
// ❌ OLD CODE
class ContractsScreen extends StatelessWidget {
  final List<Contract> contracts = [
    Contract(
      id: '1',
      title: 'Sample Contract',
      status: 'pending',
      createdAt: DateTime.now(),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Contracts')),
      body: ListView.builder(
        itemCount: contracts.length,
        itemBuilder: (context, index) {
          return ListTile(
            title: Text(contracts[index].title),
          );
        },
      ),
    );
  }
}
```

### After (Backend API):

```dart
// ✅ NEW CODE
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
      appBar: AppBar(
        title: Text('My Contracts'),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: () {
              context.read<ContractProvider>().loadContracts();
            },
          ),
        ],
      ),
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
                  Icon(Icons.error, size: 64, color: Colors.red),
                  SizedBox(height: 16),
                  Text('Error: ${provider.error}'),
                  SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => provider.loadContracts(),
                    child: Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (provider.contracts.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.description, size: 64, color: Colors.grey),
                  SizedBox(height: 16),
                  Text(
                    'No contracts found',
                    style: TextStyle(fontSize: 18),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Your contracts will appear here when they are assigned to you.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => provider.loadContracts(),
            child: ListView.builder(
              padding: EdgeInsets.all(16),
              itemCount: provider.contracts.length,
              itemBuilder: (context, index) {
                final contract = provider.contracts[index];
                return Card(
                  margin: EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    title: Text('Contract ${contract.id.substring(0, 8)}'),
                    subtitle: Text('Status: ${contract.status}'),
                    trailing: Chip(
                      label: Text(contract.status.toUpperCase()),
                      backgroundColor: _getStatusColor(contract.status),
                    ),
                    onTap: () {
                      // Navigate to contract details
                    },
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return Colors.orange;
      case 'signed':
        return Colors.green;
      case 'completed':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }
}
```

---

## Testing the Migration

### 1. Verify Authentication
```dart
void testAuth() {
  final user = Supabase.instance.client.auth.currentUser;
  print('User authenticated: ${user != null}');
  print('User ID: ${user?.id}');
}
```

### 2. Test Contract Loading
```dart
Future<void> testLoadContracts() async {
  try {
    final service = ContractService();
    final contracts = await service.getMyContracts();
    print('✅ Loaded ${contracts.length} contracts');
    for (var contract in contracts) {
      print('  - ${contract.id}: ${contract.status}');
    }
  } catch (e) {
    print('❌ Error: $e');
  }
}
```

### 3. Check Network Requests
- Open Flutter DevTools
- Go to Network tab
- Verify requests to `contract_instances` endpoint
- Check response status (should be 200)

---

## Troubleshooting

### Issue: "User not authenticated"
**Solution**: Add login screen and authenticate users before loading contracts.

### Issue: Empty results but contracts exist in database
**Solution**: 
- Check if user ID matches `customer_id` or `influencer_id`
- Verify RLS policies allow SELECT
- Test query in Supabase SQL Editor

### Issue: 401 Unauthorized
**Solution**: 
- Token expired - re-authenticate
- Missing Authorization header
- Check Supabase URL and anon key

### Issue: Contracts not updating
**Solution**: 
- Add pull-to-refresh
- Call `loadContracts()` when screen appears
- Use `RefreshIndicator` widget

---

## Next Steps

1. **Remove all local/mock data files** (JSON, hardcoded lists, mock services)
2. **Update all screens** that display contracts
3. **Add authentication** if not already implemented
4. **Test with real user accounts** and contracts
5. **Add error handling** and loading states everywhere
6. **Implement caching** (optional) - cache contracts locally but still fetch from backend first

---

## Summary

**Key Changes:**
- ❌ Remove: Hardcoded lists, local JSON files, mock services
- ✅ Add: Supabase client, authentication, API calls, loading states, error handling
- 🔄 Update: Providers, UI components, state management

**Remember:**
- Always authenticate users before loading contracts
- Handle loading and error states
- Contracts are filtered by user ID (RLS policies)
- Test with real data from your Supabase database

---

For more details on the backend API structure, see `FLUTTER_CONTRACT_LOADING_GUIDE.md`.


