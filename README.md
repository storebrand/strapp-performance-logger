Strapp logger
=========================

Tradisjonelt logger vi tid p� transaksjoner til Strapp fra serversiden. I moderne webapplikasjoner er det derimot slik at mye tid kan g� med etter at den f�rste responsen er levert fra serveren. Relevante faktorerer her
er AJAX-foresp�rsler, lasting av statiske ressurser som Javascript, CSS og grafikk, samt eksekveringstid p� Javascript. Av den grunn er det ofte et betydelig misforhold mellom tiden som medg�r p� serversiden og den
tiden en bruker opplever medg�r i nettleseren.

Hensikten med scriptet er � kunne ta tiden p� den brukeropplevde tiden det tar � laste en side, enkelt sagt start og stoppe klokken i nettleseren. Dette inkluderer asynkrone foresp�rsler (AJAX) som utf�res etter at selve 
siden er lastet og lasting av statiske ressurser.