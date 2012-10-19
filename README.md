# Strapp logger

Tradisjonelt logger vi tid på transaksjoner til Strapp fra serversiden. I moderne webapplikasjoner er det derimot slik at mye tid kan gå med etter at den første responsen er levert fra serveren. Relevante faktorerer her
er AJAX-forespørsler, lasting av statiske ressurser som Javascript, CSS og grafikk, samt eksekveringstid på Javascript. Av den grunn er det ofte et betydelig misforhold mellom tiden som medgår på serversiden og den
tiden en bruker opplever medgår i nettleseren.

Hensikten med scriptet er å kunne ta tiden på den brukeropplevde tiden det tar å laste en side, enkelt sagt start og stoppe klokken i nettleseren. Dette inkluderer asynkrone forespørsler (AJAX) som utføres etter at selve 
siden er lastet og lasting av statiske ressurser. Kort sagt er oppgaven til scriptet å detektere når en side er fullstendig ferdig lastet, og deretter rapportere dette tilbake til serveren slik at denne kan logge transaksjonen
til Strapp.

Ved å implementere Strapp-logging på serversiden og kombinere dette med tidsmålinger fra nettleseren vha. scriptet kan det produseres komplette transaksjoner slik som dette eksemplet viser:

    http://pavo/strapp/logg.action?loggForm.transaksjonsReferanse=1c4f0224-219d-4271-a8c2-eb8dba592a5a

## Ressurser

Logging vil alltid påføre applikasjonen noe mer tidsbruk. For å holde dette påslaget så lite som mulig er Javascriptet som utfører monitorering og logging tilbake til server hostet på Storebrand sitt CDN på Amazon. Scriptet er versjonert og en versjonert utgave av scriptet vil aldri endres. Nyeste versjon er alltid tilgjengelig under egen katalog.

### Latest (ny versjon, endres uten varsel)

    http://elements.storebrand.no/strapp-perf-logger/latest/StrappLogger.js

Alternativ (oppdateres hyppigere):

    http://s3-eu-west-1.amazonaws.com/stbdesign/strapp-perf-logger/latest/StrappLogger.js

## Bruk

For å gjøre måling av tidsbruk ved sidelasting, må to operasjoner utføres:

1. Registrering av starttidspunkt
2. Initialisering av StrappLogger.SendStack

### Registrering av starttidspunkt

For å avgjøre totaltid for en sidelasting, må vi avgjøre når stoppeklokken skal starte. Å finne det rette tidspunktet kan variere fra applikasjon til applikasjon, så det er opp til den aktuelle applikasjonen og registrere et
timestamp som representerer det reelle starttidspunktet for sidelastingen. Så langt har vi sett behov for å gjøre dette på to ulike måter: Enten ved å starte klokken tidlig i siden som lastes eller skrive timestamp ned i en cookie
som senere hentes opp. Selve scriptet er uavhengig av hvilken metode som benyttes for å registrere starttidspunkt, det sentrale er at scriptet initialiseres med et starttidspunkt.

#### Starte klokken når respons er mottatt

For noen applikasjoner påløper det meste av lastetiden etter at den første responsen er mottatt. Et eksempel på en slik applikasjon er _KiC_, som returnerer et sideskall som deretter henter data asynkront. I slike tilfeller 
kan starttidspunktet registreres så tidlig som mulig i HTML-koden som er returnert:

```html
<script type="text/javascript">
	var StopWatch = StopWatch || {};

	StopWatch.initTime = new Date().getTime();
</script>
```

Denne tilnærmingen vil følgelig _miste_ den tiden det tok å hente det første HTML-dokumentet, men kan være en god tilnærming.

#### Starte klokken utenfor applikasjonen og lagre til cookie

Dersom det er behov for å starte stoppeklokken tidligere, f. eks. når brukeren klikker på en lenke som leder til siden som skal måles, er anbefalingen at tidspunktet (som timestamp) lagres i en cookie. Verdien i cookien kan da senere leses opp slik at riktig tidsmåling logges.

### Initialisering av StrappLogger.SendStack

SendStack-objektet holder rede på når en side er ferdig lastet, f. eks. ved å monitorere ut- og inngående AJAX-forespørsler. Når en side er komplett lastet, vil scriptet sende registrerte data tilbake til serveren som POST av JSON-data.

Filen StrappLogger.js må inkluderes på siden, og umiddelbart etter at scriptet er lastet på StrappLogger.SendStack initialiseres. På denne måte vil all aktivitet på siden registreres. De grunnleggende egenskapene objektet skal initialiseres med er:

* Registrert starttidspunkt
* URL som skal benyttes for å logge data
* Strapp application reference som skal benyttes som toppnivå transaksjon

I tillegg finnes det flere attributter som kan benyttes for mer avansert oppførsel.

Eksempel på initialisering:

```html
<script type="text/javascript">
	new StrappLogger.SendStack({
		initTime: initTime,
		loggingUrl: 'strapplogger.html', 
		applicationReference: '25892e17-80f6-415f-9c65-7395632f0223'		
	});
</script>
```

I eksemplet over vil JSON-data som beskriver sidelastingen postes til _strapplogger.html_ når siden er ferdig lastet. Under vises et eksempel på JSON-data som postes:

```json
{	
	applicationReference: "25892e17-80f6-415f-9c65-7395632f0223",
	idleTime: 0,
	premature: false,
	requests: [],	
	totalResponseTime: 124
}
```

Her ser vi at den totale lastetiden var på 124 ms og at det ikke har vært utført noen AJAX-requests ifb. sidelastingen. Application reference som objektet ble initialisert med er også inkludert i strukturen slik at loggingen på serversiden kan logge transaksjonen med riktig toppnivå. Ved å skru dette riktig sammen blir transaksjonen i nettleseren (les: sidelastingen) toppnivået i Strapp-treet. Dette implementeres enklest ved at alle transaksjoner som logges på serveren benytter application reference som SendStack er initialisert med som _client reference_.




