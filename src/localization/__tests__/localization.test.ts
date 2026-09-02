import { translations } from '../translations';

describe('Localization & Bilingual Dictionary', () => {
  it('contains English and Gujarati translation dictionaries', () => {
    expect(translations.en).toBeDefined();
    expect(translations.gu).toBeDefined();
  });

  it('has matching keys between English and Gujarati for navigation', () => {
    const enNavKeys = Object.keys(translations.en.nav).sort();
    const guNavKeys = Object.keys(translations.gu.nav).sort();
    expect(guNavKeys).toEqual(enNavKeys);
  });

  it('has matching keys between English and Gujarati for dashboard', () => {
    const enDashKeys = Object.keys(translations.en.dashboard).sort();
    const guDashKeys = Object.keys(translations.gu.dashboard).sort();
    expect(guDashKeys).toEqual(enDashKeys);
  });

  it('has matching keys between English and Gujarati for invoices', () => {
    const enInvoiceKeys = Object.keys(translations.en.invoices).sort();
    const guInvoiceKeys = Object.keys(translations.gu.invoices).sort();
    expect(guInvoiceKeys).toEqual(enInvoiceKeys);
  });

  it('has matching keys between English and Gujarati for createInvoice', () => {
    const enCreateKeys = Object.keys(translations.en.createInvoice).sort();
    const guCreateKeys = Object.keys(translations.gu.createInvoice).sort();
    expect(guCreateKeys).toEqual(enCreateKeys);
  });

  it('has matching keys between English and Gujarati for settings and customers', () => {
    const enSettingsKeys = Object.keys(translations.en.settings).sort();
    const guSettingsKeys = Object.keys(translations.gu.settings).sort();
    expect(guSettingsKeys).toEqual(enSettingsKeys);

    const enCustKeys = Object.keys(translations.en.customers).sort();
    const guCustKeys = Object.keys(translations.gu.customers).sort();
    expect(guCustKeys).toEqual(enCustKeys);
  });
});
