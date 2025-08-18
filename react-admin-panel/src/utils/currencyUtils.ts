// Currency codes mapping for countries
export const countryCurrencyMap: { [key: string]: string } = {
  'US': 'USD',
  'CA': 'CAD',
  'GB': 'GBP',
  'AU': 'AUD',
  'DE': 'EUR',
  'FR': 'EUR',
  'IT': 'EUR',
  'ES': 'EUR',
  'NL': 'EUR',
  'BE': 'EUR',
  'CH': 'CHF',
  'AT': 'EUR',
  'SE': 'SEK',
  'NO': 'NOK',
  'DK': 'DKK',
  'FI': 'EUR',
  'IE': 'EUR',
  'NZ': 'NZD',
  'JP': 'JPY',
  'KR': 'KRW',
  'SG': 'SGD',
  'HK': 'HKD',
  'AE': 'AED',
  'BH': 'BHD',
  'KW': 'KWD',
  'OM': 'OMR',
  'QA': 'QAR',
  'SA': 'SAR',
  'IN': 'INR',
  'BR': 'BRL',
  'MX': 'MXN',
  'AR': 'ARS',
  'CL': 'CLP',
  'CO': 'COP',
  'PE': 'PEN',
  'ZA': 'ZAR',
  'EG': 'EGP',
  'NG': 'NGN',
  'KE': 'KES',
  'MA': 'MAD',
  'TH': 'THB',
  'VN': 'VND',
  'PH': 'PHP',
  'MY': 'MYR',
  'ID': 'IDR',
  'TR': 'TRY',
  'IL': 'ILS',
  'PL': 'PLN',
  'CZ': 'CZK',
  'HU': 'HUF',
  'RO': 'RON',
  'BG': 'BGN',
  'HR': 'EUR',
  'SI': 'EUR',
  'SK': 'EUR',
  'LT': 'EUR',
  'LV': 'EUR',
  'EE': 'EUR',
  'RU': 'RUB',
  'UA': 'UAH',
  'BY': 'BYN',
  'KZ': 'KZT',
  'UZ': 'UZS',
  'KG': 'KGS',
  'TJ': 'TJS',
  'TM': 'TMT',
  'AZ': 'AZN',
  'GE': 'GEL',
  'AM': 'AMD',
  'MD': 'MDL',
  'AL': 'ALL',
  'MK': 'MKD',
  'ME': 'EUR',
  'RS': 'RSD',
  'BA': 'BAM',
  'XK': 'EUR',
  'GR': 'EUR',
  'CY': 'EUR',
  'MT': 'EUR',
  'PT': 'EUR',
  'LU': 'EUR',
  'IS': 'ISK',
  'OTHER': 'USD'
};

/**
 * Get currency code for a given country code
 * @param countryCode - ISO country code (e.g., 'US', 'GB', 'DE')
 * @returns Currency code (e.g., 'USD', 'GBP', 'EUR') or 'USD' as default
 */
export const getCurrencyByCountry = (countryCode: string): string => {
  return countryCurrencyMap[countryCode] || 'USD';
};

/**
 * Get currency symbol for a given currency code
 * @param currencyCode - Currency code (e.g., 'USD', 'EUR', 'GBP')
 * @returns Currency symbol (e.g., '$', '€', '£') or currency code as fallback
 */
export const getCurrencySymbol = (currencyCode: string): string => {
  const symbols: { [key: string]: string } = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CAD': 'C$',
    'AUD': 'A$',
    'CHF': 'CHF',
    'CNY': '¥',
    'INR': '₹',
    'BRL': 'R$',
    'MXN': '$',
    'SGD': 'S$',
    'HKD': 'HK$',
    'NZD': 'NZ$',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'ZAR': 'R',
    'TRY': '₺',
    'RUB': '₽',
    'KRW': '₩',
    'THB': '฿',
    'MYR': 'RM',
    'IDR': 'Rp',
    'PHP': '₱',
    'VND': '₫',
    'AED': 'د.إ',
    'BHD': 'د.ب',
    'KWD': 'د.ك',
    'OMR': 'ر.ع.',
    'QAR': 'ر.ق',
    'SAR': 'ر.س',
    'EGP': 'E£',
    'NGN': '₦',
    'KES': 'KSh',
    'MAD': 'MAD',
    'ARS': 'AR$',
    'CLP': 'CL$',
    'COP': 'CO$',
    'PEN': 'S/',
    'UAH': '₴',
    'BYN': 'Br',
    'KZT': '₸',
    'UZS': 'so\'m',
    'KGS': 'с',
    'TJS': 'ЅM',
    'TMT': 'T',
    'AZN': '₼',
    'GEL': '₾',
    'AMD': '֏',
    'MDL': 'L',
    'ALL': 'L',
    'MKD': 'ден',
    'RSD': 'дин',
    'BAM': 'KM',
    'ISK': 'kr'
  };
  
  return symbols[currencyCode] || currencyCode;
};

/**
 * Format price with currency symbol
 * @param amount - Amount to format
 * @param currencyCode - Currency code
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted price string
 */
export const formatPrice = (amount: number, currencyCode: string, locale: string = 'en-US'): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  } catch (error) {
    // Fallback formatting if Intl is not supported or currency is invalid
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${amount.toFixed(2)}`;
  }
}; 