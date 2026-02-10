# Flutter Influencer App - Contract Integration Guide

## Overview
This guide shows how to integrate the contract system from your React admin panel into your Flutter influencer app, allowing influencers to view, sign, and manage contracts.

## 1. Flutter Dependencies

Add these dependencies to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # HTTP requests
  http: ^1.1.0
  
  # State management
  provider: ^6.1.1
  # OR
  bloc: ^8.1.2
  flutter_bloc: ^8.1.3
  
  # Local storage
  shared_preferences: ^2.2.2
  
  # JSON handling
  json_annotation: ^4.8.1
  
  # Date handling
  intl: ^0.19.0
  
  # WebView for contract preview
  webview_flutter: ^4.4.2
  
  # PDF generation (optional)
  pdf: ^3.10.7
  printing: ^5.11.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  json_serializable: ^6.7.1
  build_runner: ^2.4.7
```

## 2. Supabase Configuration

### Create `lib/config/supabase_config.dart`:

```dart
class SupabaseConfig {
  static const String supabaseUrl = 'YOUR_SUPABASE_URL';
  static const String supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
  
  // API endpoints
  static const String baseUrl = '$supabaseUrl/rest/v1';
  
  // Headers
  static Map<String, String> get headers => {
    'apikey': supabaseAnonKey,
    'Authorization': 'Bearer $supabaseAnonKey',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}
```

## 3. Data Models

### Create `lib/models/contract.dart`:

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
  final String contractId;
  final String customerId;
  final String influencerId;
  final String? bookingId;
  final String status;
  final DateTime? signedAt;
  final DateTime? completedAt;
  final DateTime createdAt;
  final Map<String, dynamic> variablesData;

  ContractInstance({
    required this.id,
    required this.contractId,
    required this.customerId,
    required this.influencerId,
    this.bookingId,
    required this.status,
    this.signedAt,
    this.completedAt,
    required this.createdAt,
    required this.variablesData,
  });

  factory ContractInstance.fromJson(Map<String, dynamic> json) =>
      _$ContractInstanceFromJson(json);
  Map<String, dynamic> toJson() => _$ContractInstanceToJson(this);
}

@JsonSerializable()
class ContractSignature {
  final String id;
  final String contractInstanceId;
  final String userId;
  final String signatureType;
  final String signatureData;
  final DateTime signedAt;

  ContractSignature({
    required this.id,
    required this.contractInstanceId,
    required this.userId,
    required this.signatureType,
    required this.signatureData,
    required this.signedAt,
  });

  factory ContractSignature.fromJson(Map<String, dynamic> json) =>
      _$ContractSignatureFromJson(json);
  Map<String, dynamic> toJson() => _$ContractSignatureToJson(this);
}
```

## 4. API Service

### Create `lib/services/contract_service.dart`:

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/supabase_config.dart';
import '../models/contract.dart';

class ContractService {
  // Get contract templates
  Future<List<ContractTemplate>> getContractTemplates() async {
    try {
      final response = await http.get(
        Uri.parse('${SupabaseConfig.baseUrl}/contract_templates?select=*&is_active=eq.true'),
        headers: SupabaseConfig.headers,
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => ContractTemplate.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load contract templates: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching contract templates: $e');
    }
  }

  // Get contract instances for an influencer
  Future<List<ContractInstance>> getInfluencerContracts(String influencerId) async {
    try {
      final response = await http.get(
        Uri.parse('${SupabaseConfig.baseUrl}/contract_instances?select=*&influencer_id=eq.$influencerId'),
        headers: SupabaseConfig.headers,
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => ContractInstance.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load contracts: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching contracts: $e');
    }
  }

  // Get contract instance details
  Future<ContractInstance> getContractInstance(String contractId) async {
    try {
      final response = await http.get(
        Uri.parse('${SupabaseConfig.baseUrl}/contract_instances?select=*&id=eq.$contractId'),
        headers: SupabaseConfig.headers,
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

  // Sign a contract
  Future<void> signContract(String contractInstanceId, String userId, String signatureData) async {
    try {
      final signature = {
        'contract_instance_id': contractInstanceId,
        'user_id': userId,
        'signature_type': 'digital',
        'signature_data': signatureData,
        'signed_at': DateTime.now().toIso8601String(),
      };

      final response = await http.post(
        Uri.parse('${SupabaseConfig.baseUrl}/contract_signatures'),
        headers: SupabaseConfig.headers,
        body: json.encode(signature),
      );

      if (response.statusCode == 201) {
        // Update contract instance status
        await updateContractStatus(contractInstanceId, 'signed');
      } else {
        throw Exception('Failed to sign contract: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error signing contract: $e');
    }
  }

  // Update contract status
  Future<void> updateContractStatus(String contractInstanceId, String status) async {
    try {
      final updateData = {
        'status': status,
        if (status == 'signed') 'signed_at': DateTime.now().toIso8601String(),
        if (status == 'completed') 'completed_at': DateTime.now().toIso8601String(),
      };

      final response = await http.patch(
        Uri.parse('${SupabaseConfig.baseUrl}/contract_instances?id=eq.$contractInstanceId'),
        headers: SupabaseConfig.headers,
        body: json.encode(updateData),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to update contract status: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error updating contract status: $e');
    }
  }

  // Generate contract preview with variables
  String generateContractPreview(String templateContent, Map<String, dynamic> variables) {
    String preview = templateContent;
    
    variables.forEach((key, value) {
      final regex = RegExp(r'\{\{' + key + r'\}\}');
      preview = preview.replaceAll(regex, value.toString());
    });
    
    return preview;
  }
}
```

## 5. State Management (Provider Example)

### Create `lib/providers/contract_provider.dart`:

```dart
import 'package:flutter/foundation.dart';
import '../models/contract.dart';
import '../services/contract_service.dart';

class ContractProvider with ChangeNotifier {
  final ContractService _contractService = ContractService();
  
  List<ContractTemplate> _templates = [];
  List<ContractInstance> _contracts = [];
  bool _isLoading = false;
  String? _error;

  List<ContractTemplate> get templates => _templates;
  List<ContractInstance> get contracts => _contracts;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Load contract templates
  Future<void> loadTemplates() async {
    _setLoading(true);
    try {
      _templates = await _contractService.getContractTemplates();
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _setLoading(false);
    }
  }

  // Load influencer contracts
  Future<void> loadInfluencerContracts(String influencerId) async {
    _setLoading(true);
    try {
      _contracts = await _contractService.getInfluencerContracts(influencerId);
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _setLoading(false);
    }
  }

  // Sign contract
  Future<void> signContract(String contractInstanceId, String userId, String signatureData) async {
    try {
      await _contractService.signContract(contractInstanceId, userId, signatureData);
      // Reload contracts to reflect the change
      await loadInfluencerContracts(userId);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
```

## 6. UI Screens

### Create `lib/screens/contracts/contracts_list_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/contract_provider.dart';
import '../../models/contract.dart';
import 'contract_detail_screen.dart';

class ContractsListScreen extends StatefulWidget {
  final String influencerId;

  const ContractsListScreen({Key? key, required this.influencerId}) : super(key: key);

  @override
  State<ContractsListScreen> createState() => _ContractsListScreenState();
}

class _ContractsListScreenState extends State<ContractsListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ContractProvider>().loadInfluencerContracts(widget.influencerId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Contracts'),
        backgroundColor: Colors.blue[600],
        foregroundColor: Colors.white,
      ),
      body: Consumer<ContractProvider>(
        builder: (context, contractProvider, child) {
          if (contractProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (contractProvider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error, size: 64, color: Colors.red[300]),
                  const SizedBox(height: 16),
                  Text(
                    'Error: ${contractProvider.error}',
                    style: const TextStyle(fontSize: 16),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      contractProvider.clearError();
                      contractProvider.loadInfluencerContracts(widget.influencerId);
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (contractProvider.contracts.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.description, size: 64, color: Colors.grey),
                  SizedBox(height: 16),
                  Text(
                    'No contracts found',
                    style: TextStyle(fontSize: 18, color: Colors.grey),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'You will see your contracts here when they are assigned to you.',
                    style: TextStyle(color: Colors.grey),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => contractProvider.loadInfluencerContracts(widget.influencerId),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: contractProvider.contracts.length,
              itemBuilder: (context, index) {
                final contract = contractProvider.contracts[index];
                return ContractCard(
                  contract: contract,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => ContractDetailScreen(
                          contractInstanceId: contract.id,
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class ContractCard extends StatelessWidget {
  final ContractInstance contract;
  final VoidCallback onTap;

  const ContractCard({
    Key? key,
    required this.contract,
    required this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      'Contract #${contract.id.substring(0, 8)}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  _buildStatusChip(contract.status),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Created: ${_formatDate(contract.createdAt)}',
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 14,
                ),
              ),
              if (contract.signedAt != null) ...[
                const SizedBox(height: 4),
                Text(
                  'Signed: ${_formatDate(contract.signedAt!)}',
                  style: TextStyle(
                    color: Colors.green[600],
                    fontSize: 14,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color color;
    switch (status.toLowerCase()) {
      case 'draft':
        color = Colors.grey;
        break;
      case 'pending':
        color = Colors.orange;
        break;
      case 'signed':
        color = Colors.green;
        break;
      case 'completed':
        color = Colors.blue;
        break;
      case 'cancelled':
        color = Colors.red;
        break;
      default:
        color = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
```

### Create `lib/screens/contracts/contract_detail_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:provider/provider.dart';
import '../../providers/contract_provider.dart';
import '../../services/contract_service.dart';
import '../../models/contract.dart';

class ContractDetailScreen extends StatefulWidget {
  final String contractInstanceId;

  const ContractDetailScreen({Key? key, required this.contractInstanceId}) : super(key: key);

  @override
  State<ContractDetailScreen> createState() => _ContractDetailScreenState();
}

class _ContractDetailScreenState extends State<ContractDetailScreen> {
  final ContractService _contractService = ContractService();
  ContractInstance? _contract;
  bool _isLoading = true;
  String? _error;
  String? _contractPreview;

  @override
  void initState() {
    super.initState();
    _loadContractDetails();
  }

  Future<void> _loadContractDetails() async {
    try {
      final contract = await _contractService.getContractInstance(widget.contractInstanceId);
      setState(() {
        _contract = contract;
        _isLoading = false;
      });
      
      // Load contract template and generate preview
      await _generateContractPreview();
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _generateContractPreview() async {
    if (_contract == null) return;
    
    try {
      // Get contract template
      final templates = await _contractService.getContractTemplates();
      final template = templates.firstWhere(
        (t) => t.id == _contract!.contractId,
        orElse: () => throw Exception('Template not found'),
      );
      
      // Generate preview with variables
      final preview = _contractService.generateContractPreview(
        template.content,
        _contract!.variablesData,
      );
      
      setState(() {
        _contractPreview = preview;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    }
  }

  Future<void> _signContract() async {
    if (_contract == null) return;
    
    // Show signature dialog
    final signatureData = await _showSignatureDialog();
    if (signatureData != null) {
      try {
        await context.read<ContractProvider>().signContract(
          _contract!.id,
          _contract!.influencerId,
          signatureData,
        );
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Contract signed successfully!'),
              backgroundColor: Colors.green,
            ),
          );
          Navigator.pop(context);
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error signing contract: $e'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  Future<String?> _showSignatureDialog() async {
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign Contract'),
        content: const Text('Do you agree to the terms and conditions of this contract?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              // In a real app, you would implement a signature pad here
              // For now, we'll use a simple confirmation
              Navigator.pop(context, 'digital_signature_${DateTime.now().millisecondsSinceEpoch}');
            },
            child: const Text('Sign'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Contract Details'),
        backgroundColor: Colors.blue[600],
        foregroundColor: Colors.white,
        actions: [
          if (_contract?.status == 'pending')
            TextButton(
              onPressed: _signContract,
              child: const Text(
                'SIGN',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error, size: 64, color: Colors.red[300]),
            const SizedBox(height: 16),
            Text(
              'Error: $_error',
              style: const TextStyle(fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadContractDetails,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_contract == null) {
      return const Center(child: Text('Contract not found'));
    }

    return Column(
      children: [
        // Contract info header
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          color: Colors.grey[100],
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Contract #${_contract!.id.substring(0, 8)}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _buildStatusChip(_contract!.status),
                  const Spacer(),
                  Text(
                    'Created: ${_formatDate(_contract!.createdAt)}',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ],
              ),
              if (_contract!.signedAt != null) ...[
                const SizedBox(height: 4),
                Text(
                  'Signed: ${_formatDate(_contract!.signedAt!)}',
                  style: TextStyle(color: Colors.green[600]),
                ),
              ],
            ],
          ),
        ),
        
        // Contract preview
        Expanded(
          child: _contractPreview != null
              ? WebViewWidget(
                  controller: WebViewController()
                    ..setJavaScriptMode(JavaScriptMode.unrestricted)
                    ..loadHtmlString(_contractPreview!),
                )
              : const Center(child: CircularProgressIndicator()),
        ),
      ],
    );
  }

  Widget _buildStatusChip(String status) {
    Color color;
    switch (status.toLowerCase()) {
      case 'draft':
        color = Colors.grey;
        break;
      case 'pending':
        color = Colors.orange;
        break;
      case 'signed':
        color = Colors.green;
        break;
      case 'completed':
        color = Colors.blue;
        break;
      case 'cancelled':
        color = Colors.red;
        break;
      default:
        color = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
```

## 7. Main App Integration

### Update your main app to include the contract provider:

```dart
// main.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/contract_provider.dart';
import 'screens/contracts/contracts_list_screen.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ContractProvider()),
        // Add other providers here
      ],
      child: MaterialApp(
        title: 'Influencer App',
        theme: ThemeData(
          primarySwatch: Colors.blue,
        ),
        home: MyHomePage(),
      ),
    );
  }
}

class MyHomePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Influencer Dashboard'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => ContractsListScreen(
                      influencerId: 'your-influencer-id', // Replace with actual ID
                    ),
                  ),
                );
              },
              child: const Text('View Contracts'),
            ),
          ],
        ),
      ),
    );
  }
}
```

## 8. Generate JSON Serialization

Run this command to generate the JSON serialization code:

```bash
flutter packages pub run build_runner build
```

## 9. Testing the Integration

1. **Update SupabaseConfig** with your actual Supabase URL and anon key
2. **Replace 'your-influencer-id'** with the actual influencer ID
3. **Test the contract flow**:
   - View contract templates
   - View assigned contracts
   - Sign contracts
   - Update contract status

## 10. Additional Features to Consider

- **Push notifications** for new contracts
- **Offline support** for viewing contracts
- **PDF generation** for signed contracts
- **Digital signature pad** for actual signatures
- **Contract templates** management
- **Email notifications** for contract events

This integration will allow your Flutter influencer app to seamlessly work with the contract system from your React admin panel!


