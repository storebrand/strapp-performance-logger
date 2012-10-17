# Strapp logger

Tradisjonelt logger vi tid på transaksjoner til Strapp fra serversiden. I moderne webapplikasjoner er det derimot slik at mye tid kan gå med etter at den første responsen er levert fra serveren. Relevante faktorerer her
er AJAX-forespørsler, lasting av statiske ressurser som Javascript, CSS og grafikk, samt eksekveringstid på Javascript. Av den grunn er det ofte et betydelig misforhold mellom tiden som medgår på serversiden og den
tiden en bruker opplever medgår i nettleseren.

Hensikten med scriptet er å kunne ta tiden på den brukeropplevde tiden det tar å laste en side, enkelt sagt start og stoppe klokken i nettleseren. Dette inkluderer asynkrone forespørsler (AJAX) som utføres etter at selve 
siden er lastet og lasting av statiske ressurser. Kort sagt er oppgaven til scriptet å detektere når en side er fullstendig ferdig lastet, og deretter rapportere dette tilbake til serveren slik at denne kan logge transaksjonen
til Strapp.

## Bruk

For å avgjøre totaltid for en sidelasting, må vi avgjøre når stoppeklokken skal starte. Å finne det rette tidspunktet kan variere fra applikasjon til applikasjon, så det er opp til den aktuelle applikasjonen og registrere et
timestamp som representerer det reelle starttidspunktet for sidelastingen. Så langt har vi sett behov for å gjøre dette på to ulike måter: Enten ved å starte klokken tidlig i siden som lastes eller skrive timestamp ned i en cookie
som senere hentes opp.

### Starte klokken når respons er mottatt

For noen applikasjoner påløper det meste av lastetiden etter at den første responsen er mottatt. Et eksempel på en slik applikasjon er _KiC_, som returnerer et sideskall som deretter henter all data asynkront. I slike tilfeller 
kan starttidspunktet registreres så tidlig som mulig i HTML-koden som er returnert:

```javascript
<script type="text/javascript">
	var StopWatch = StopWatch || {};

	StopWatch.initTime = new Date().getTime();
</script>
```

### Starte klokken uten



