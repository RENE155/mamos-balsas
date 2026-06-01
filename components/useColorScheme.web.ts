// PASTABA: Numatytasis React Native stilizavimas nepalaiko serverio atvaizdavimo.
// Serveryje atvaizduoti stiliai neturėtų keistis tarp pirmojo HTML atvaizdavimo
// ir pirmojo atvaizdavimo kliente. Paprastai žiniatinklio kūrėjai naudoja CSS medijos užklausas,
// kad klientui ir serveriui būtų atvaizduojami skirtingi stiliai; jos nėra tiesiogiai palaikomos React Native,
// bet jas galima įgyvendinti naudojant stilizavimo biblioteką, pavyzdžiui, Nativewind.
export function useColorScheme() {
  return 'light';
}
