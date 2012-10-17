# Strapp logger

Tradisjonelt logger vi tid p� transaksjoner til Strapp fra serversiden. I moderne webapplikasjoner er det derimot slik at mye tid kan g� med etter at den f�rste responsen er levert fra serveren. Relevante faktorerer her
er AJAX-foresp�rsler, lasting av statiske ressurser som Javascript, CSS og grafikk, samt eksekveringstid p� Javascript. Av den grunn er det ofte et betydelig misforhold mellom tiden som medg�r p� serversiden og den
tiden en bruker opplever medg�r i nettleseren.

Hensikten med scriptet er � kunne ta tiden p� den brukeropplevde tiden det tar � laste en side, enkelt sagt start og stoppe klokken i nettleseren. Dette inkluderer asynkrone foresp�rsler (AJAX) som utf�res etter at selve 
siden er lastet og lasting av statiske ressurser. Kort sagt er oppgaven til scriptet � detektere n�r en side er fullstendig ferdig lastet, og deretter rapportere dette tilbake til serveren slik at denne kan logge transaksjonen
til Strapp.

## Bruk

For � avgj�re totaltid for en sidelasting, m� vi avgj�re n�r stoppeklokken skal starte. � finne det rette tidspunktet kan variere fra applikasjon til applikasjon, s� det er opp til den aktuelle applikasjonen og registrere et
timestamp som representerer det reelle starttidspunktet for sidelastingen. S� langt har vi sett behov for � gj�re dette p� to ulike m�ter: Enten ved � starte klokken tidlig i siden som lastes eller skrive timestamp ned i en cookie
som senere hentes opp.

### Starte klokken n�r respons er mottatt

For noen applikasjoner p�l�per det meste av lastetiden etter at den f�rste responsen er mottatt. Et eksempel p� en slik applikasjon er _KiC_, som returnerer et sideskall som deretter henter all data asynkront. I slike tilfeller 
kan starttidspunktet registreres s� tidlig som mulig i HTML-koden som er returnert:

```javascript
<script type="text/javascript">
	var StopWatch = StopWatch || {};

	StopWatch.initTime = new Date().getTime();
</script>
```

### Starte klokken uten



