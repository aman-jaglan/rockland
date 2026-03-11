import type { FQHCProfile } from '@/lib/types';

/**
 * Synthetic FQHC profile for demo purposes.
 * Based on a realistic San Francisco community health center.
 */
export const SYNTHETIC_PROFILE: FQHCProfile = {
  id: 'demo-fqhc-001',
  name: 'Bay Area Community Health Center',
  ein: '94-1234567',
  address: {
    street: '1200 Market Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
  },
  services: [
    'Primary Care',
    'Dental',
    'Behavioral Health',
    'HIV/AIDS Services',
    'Substance Abuse Treatment',
    'Pediatrics',
  ],
  patientDemographics: [
    'Low-income',
    'Uninsured',
    'Homeless',
    'LGBTQ+',
    'Immigrants',
  ],
  staffCount: 145,
  annualBudget: 12500000, // $12.5M
  activeGrants: [
    'HRSA Health Center Program (330)',
    'Ryan White HIV/AIDS Program',
    'SAMHSA Substance Abuse Block Grant',
  ],
  fqhcDesignation: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date(),
};

/**
 * Returns the synthetic profile.
 * In production, this would fetch from the database or API.
 */
export function getSyntheticProfile(): FQHCProfile {
  return SYNTHETIC_PROFILE;
}

/**
 * Checks if the app is using the synthetic profile (demo mode).
 */
export function isDemoMode(): boolean {
  // For now, always return true since we're in prototype mode
  return true;
}
