import { ScrollViewStyleReset } from 'expo-router/html';

// Šis failas skirtas tik žiniatinkliui ir naudojamas konfigūruoti šakninį HTML
// kiekvienam žiniatinklio puslapiui statinio atvaizdavimo metu.
// Šios funkcijos turinys veikia tik Node.js aplinkoje ir
// neturi prieigos prie DOM ar naršyklės API.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/*
          Išjungti body slinkimą žiniatinklyje. Dėl to ScrollView komponentai veikia panašiau kaip vietinėje aplinkoje.
          Vis dėlto mobiliajame žiniatinklyje body slinkimas dažnai būna naudingas. Jei norite jį įjungti, pašalinkite šią eilutę.
        */}
        <ScrollViewStyleReset />

        {/* Naudojami neapdoroti CSS stiliai kaip apėjimo būdas užtikrinti, kad fono spalva niekada nemirgėtų tamsiame režime. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Pridėkite bet kokius papildomus <head> elementus, kuriuos norite turėti visuotinai prieinamus žiniatinklyje... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #fff;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}`;
