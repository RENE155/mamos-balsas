import React from 'react';

// `useEffect` nėra iškviečiama serverio atvaizdavimo metu, tai reiškia,
// kad galime tai naudoti norėdami nustatyti, ar esame serveryje, ar ne.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  const [value, setValue] = React.useState<S | C>(server);
  React.useEffect(() => {
    setValue(client);
  }, [client]);

  return value;
}
