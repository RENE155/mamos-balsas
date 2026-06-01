// Ši funkcija skirta tik žiniatinkliui, nes vietinė aplinka šiuo metu nepalaiko serverio (ar kūrimo metu vykdomo) atvaizdavimo.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  return client;
}
