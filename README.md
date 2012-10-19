# Strapp logger

Tradisjonelt logger vi tid p� transaksjoner til Strapp fra serversiden. I moderne webapplikasjoner er det derimot slik at mye tid kan g� med etter at den f�rste responsen er levert fra serveren. Relevante faktorerer her
er AJAX-foresp�rsler, lasting av statiske ressurser som Javascript, CSS og grafikk, samt eksekveringstid p� Javascript. Av den grunn er det ofte et betydelig misforhold mellom tiden som medg�r p� serversiden og den
tiden en bruker opplever medg�r i nettleseren.

Hensikten med scriptet er � kunne ta tiden p� den brukeropplevde tiden det tar � laste en side, enkelt sagt start og stoppe klokken i nettleseren. Dette inkluderer asynkrone foresp�rsler (AJAX) som utf�res etter at selve 
siden er lastet og lasting av statiske ressurser. Kort sagt er oppgaven til scriptet � detektere n�r en side er fullstendig ferdig lastet, og deretter rapportere dette tilbake til serveren slik at denne kan logge transaksjonen
til Strapp.

Ved � implementere Strapp-logging p� serversiden og kombinere dette med tidsm�linger fra nettleseren vha. scriptet kan det produseres komplette transaksjoner slik som dette eksemplet viser:

    http://pavo/strapp/logg.action?loggForm.transaksjonsReferanse=1c4f0224-219d-4271-a8c2-eb8dba592a5a

## Ressurser

Logging vil alltid p�f�re applikasjonen noe mer tidsbruk. For � holde dette p�slaget s� lite som mulig er Javascriptet som utf�rer monitorering og logging tilbake til server hostet p� Storebrand sitt CDN p� Amazon. Scriptet er versjonert og en versjonert utgave av scriptet vil aldri endres. Nyeste versjon er alltid tilgjengelig under egen katalog.

### Latest (ny versjon, endres uten varsel)

    http://elements.storebrand.no/strapp-perf-logger/latest/StrappLogger.js

Alternativ (oppdateres hyppigere):

    http://s3-eu-west-1.amazonaws.com/stbdesign/strapp-perf-logger/latest/StrappLogger.js

## Bruk

For � gj�re m�ling av tidsbruk ved sidelasting, m� to operasjoner utf�res:

1. Registrering av starttidspunkt
2. Initialisering av StrappLogger.SendStack

### Registrering av starttidspunkt

For � avgj�re totaltid for en sidelasting, m� vi avgj�re n�r stoppeklokken skal starte. � finne det rette tidspunktet kan variere fra applikasjon til applikasjon, s� det er opp til den aktuelle applikasjonen og registrere et
timestamp som representerer det reelle starttidspunktet for sidelastingen. S� langt har vi sett behov for � gj�re dette p� to ulike m�ter: Enten ved � starte klokken tidlig i siden som lastes eller skrive timestamp ned i en cookie
som senere hentes opp. Selve scriptet er uavhengig av hvilken metode som benyttes for � registrere starttidspunkt, det sentrale er at scriptet initialiseres med et starttidspunkt.

#### Starte klokken n�r respons er mottatt

For noen applikasjoner p�l�per det meste av lastetiden etter at den f�rste responsen er mottatt. Et eksempel p� en slik applikasjon er _KiC_, som returnerer et sideskall som deretter henter data asynkront. I slike tilfeller 
kan starttidspunktet registreres s� tidlig som mulig i HTML-koden som er returnert:

```html
<script type="text/javascript">
	var StopWatch = StopWatch || {};

	StopWatch.initTime = new Date().getTime();
</script>
```

Denne tiln�rmingen vil f�lgelig _miste_ den tiden det tok � hente det f�rste HTML-dokumentet, men kan v�re en god tiln�rming.

#### Starte klokken utenfor applikasjonen og lagre til cookie

Dersom det er behov for � starte stoppeklokken tidligere, f. eks. n�r brukeren klikker p� en lenke som leder til siden som skal m�les, er anbefalingen at tidspunktet (som timestamp) lagres i en cookie. Verdien i cookien kan da senere leses opp slik at riktig tidsm�ling logges.

### Initialisering av StrappLogger.SendStack

SendStack-objektet holder rede p� n�r en side er ferdig lastet, f. eks. ved � monitorere ut- og inng�ende AJAX-foresp�rsler. N�r en side er komplett lastet, vil scriptet sende registrerte data tilbake til serveren som POST av JSON-data.

Filen StrappLogger.js m� inkluderes p� siden, og umiddelbart etter at scriptet er lastet p� StrappLogger.SendStack initialiseres. P� denne m�te vil all aktivitet p� siden registreres. De grunnleggende egenskapene objektet skal initialiseres med er:

* Registrert starttidspunkt
* URL som skal benyttes for � logge data
* Strapp application reference som skal benyttes som toppniv� transaksjon

I tillegg finnes det flere attributter som kan benyttes for mer avansert oppf�rsel.

Eksempel p� initialisering:

```html
<script type="text/javascript">
	new StrappLogger.SendStack({
		initTime: initTime,
		loggingUrl: 'strapplogger.html', 
		applicationReference: '25892e17-80f6-415f-9c65-7395632f0223'		
	});
</script>
```

I eksemplet over vil JSON-data som beskriver sidelastingen postes til _strapplogger.html_ n�r siden er ferdig lastet. Under vises et eksempel p� JSON-data som postes:

```json
{	
	applicationReference: "25892e17-80f6-415f-9c65-7395632f0223",
	idleTime: 0,
	premature: false,
	requests: [],	
	totalResponseTime: 124
}
```

Her ser vi at den totale lastetiden var p� 124 ms og at det ikke har v�rt utf�rt noen AJAX-requests ifb. sidelastingen. Application reference som objektet ble initialisert med er ogs� inkludert i strukturen slik at loggingen p� serversiden kan logge transaksjonen med riktig toppniv�. Ved � skru dette riktig sammen blir transaksjonen i nettleseren (les: sidelastingen) toppniv�et i Strapp-treet. Dette implementeres enklest ved at alle transaksjoner som logges p� serveren benytter application reference som SendStack er initialisert med som _client reference_.




