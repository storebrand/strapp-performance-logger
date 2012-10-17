Strapp logger
=========================

Tradisjonelt logger vi tid på transaksjoner til Strapp fra serversiden. I moderne webapplikasjoner er det derimot slik at mye tid kan gå med etter at den første responsen er levert fra serveren. Relevante faktorerer her
er AJAX-forespørsler, lasting av statiske ressurser som Javascript, CSS og grafikk, samt eksekveringstid på Javascript. Av den grunn er det ofte et betydelig misforhold mellom tiden som medgår på serversiden og den
tiden en bruker opplever medgår i nettleseren.

Hensikten med scriptet er å kunne ta tiden på den brukeropplevde tiden det tar å laste en side, enkelt sagt start og stoppe klokken i nettleseren. Dette inkluderer asynkrone forespørsler (AJAX) som utføres etter at selve 
siden er lastet og lasting av statiske ressurser.