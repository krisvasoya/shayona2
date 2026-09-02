import { mapAuthError } from '../errors';

describe('Auth Error Mapping', () => {
  it('should map invalid credentials error to friendly message', () => {
    const message = mapAuthError({ message: 'Invalid login credentials' });
    expect(message).toBe('Incorrect mobile number or password. Please verify and try again.');
  });

  it('should map user already registered error', () => {
    const message = mapAuthError({ message: 'User already registered' });
    expect(message).toBe(
      'An account with this mobile number already exists. Please login instead.',
    );
  });

  it('should map token expired error to OTP expired message', () => {
    const message = mapAuthError({ message: 'Token has expired or is invalid' });
    expect(message).toBe(
      'The verification code is invalid or has expired. Please request a new code.',
    );
  });

  it('should map rate limit error to retry message', () => {
    const message = mapAuthError({ message: 'Too many requests', status: 429 });
    expect(message).toBe('Too many attempts. Please wait a minute before trying again.');
  });

  it('should map network error', () => {
    const message = mapAuthError({ message: 'Failed to fetch network request' });
    expect(message).toBe('Unable to connect to the server. Please check your internet connection.');
  });

  it('should map Google login cancellation', () => {
    const message = mapAuthError({ message: 'user_cancelled' });
    expect(message).toBe('Google sign-in was cancelled.');
  });
});
