# UI/UX & CSS Design Patterns: La Palestra di ThreatIntel

Questa documentazione raccoglie le migliori metodologie di design, i concetti architetturali e i "trucchi CSS" utilizzati per costruire l'interfaccia investigativa del cruscotto, con un focus sul comportamento fluido e l'ergonomia "mobile-first".

---

## 1. Il Menu a Ventaglio (Radial FAB Menu)
Il componente `GlobalNavMenu.vue` è un ottimo caso studio per comprendere come si muovono gli elementi complessi.

### La Matematica del Ventaglio
Per far "sparare" i bottoni in un arco armonico partendo dal basso centro verso l'alto, non usiamo posizionamenti fissi (`top`, `left`), ma manipoliamo il **Transform Origin**.

```css
/* Posizione Base (nascosta sotto il bottone Hub) */
.fan-item {
  top: 5px; left: 5px;
  transform: scale(0.5) translate(0, 0); 
  opacity: 0;
}

/* Quando il menu si apre, aggiungiamo classi per le posizioni */
.menu-open .fan-item.pos-0 { transform: scale(1) translate(-75px, -50px); } /* Sinistra e Su */
.menu-open .fan-item.pos-1 { transform: scale(1) translate(0px, -85px); }    /* Solo Su */
.menu-open .fan-item.pos-2 { transform: scale(1) translate(75px, -50px); }  /* Destra e Su */
```
**Perché funziona bene?** L'uso di `transform` demanda tutto il lavoro di movimento (compositing) direttamente alla GPU del computer/telefono, garantendo i 60fps lisci. Usare `top` e `left` per muovere elementi farebbe ricalcolare l'intera pagina (reflow).

---

## 2. Ingranaggi e Rimbalzi (Le Curve di Bezier)
Per dare un senso "liquido" e appagante al tocco o all'entrata degli elementi (come l'icona della bussola che cade o il menu che esplode a molla), usiamo le **Cubic-Bezier Curves**, ovvero curve di accelerazione e decelerazione.

```css
/* Un'animazione standard e noiosa */
transition: all 0.3s linear; 

/* Il RIMBALZO: usato per far "sbocciare" il ventaglio */
transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);

/* LA CADUTA "PESANTE": usata per la comparsa della bussola */
animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
```
**Come si leggono quei 4 numeri?** Definiscono un grafico dove due variabili indicano l'inizio e due la fine. Se i valori escono dal range (0-1), come l' `1.55` sopra, stai dicendo al browser di "andare oltre il bersaglio e poi tornare indietro", creando a tutti gli effetti la fisica della "molla"!

---

## 3. Risolvere il "Delirio dei CSS" (Flexbox e Strabordamenti)
Sui dispositivi mobili i pixel sono un bene preziosissimo. Abbiamo visto l'errore del `LanguageSwitcher` che "strabordava" (overflow) spaccando la pagina. 

**Il Problema Base**: Quando blocchi la dimensione di un elemento (es. `min-width: 120px` per la linguetta) o definisci protezioni rigide (es. `padding-left: 50px`), se il contenitore padre non ha spazio, l'elemento figlo "buca" letteralmente il bordo destro della pagina per esistere.

**La Soluzione (Flex-Wrap e Auto-Spacing)**:
```css
/* Invece di forzare spazi fissi, diamo al CSS il permesso di negoziare */
.header-top { 
  display: flex;
  gap: 10px;          /* Minimo spazio richiesto tra elementi */
  padding: 0 10px;    /* Distanza dai bordi laterali */
  flex-wrap: wrap;    /* REGOLA D'ORO: Se non ci stai, vai a capo, non strabordare mai! */
}
```
In `LanguageSwitcher.vue`, abbiamo anche detto al CSS tramite una `Media Query` che su schermi sotto i `768px` quella dimensione minima doveva sparire (`min-width: unset`), "sgonfiandolo" in automatico per fargli spazio.

---

## 4. Architettura Reattiva: "Teletrasporto" & Z-Index
Per evitare che un Menu nascosto in fondo all'app (come quello per l'esportazione in PDF dal cruscotto Dossier) venga "tagliato" dai bordi del suo piccolo contenitore, abbiamo delegato la sua esistenza al `<Teleport>`.

```html
<!-- Dici a Vue di "prendere" questo codice e iniettarlo nel Body principale -->
<Teleport to="body">
  <div class="popover-menu">...</div>
</Teleport>
```
Questo, combinato con gli `z-index`, è l'unico modo sano di affrontare un'interfaccia fluttuante.
- **`z-index: 100`**: Header e layout base
- **`z-index: 990`**: Backdrops (gli oscuratori traslucidi per far risaltare i menu in primo piano)
- **`z-index: 1000/2000`**: FABs (Floating Action Buttons come la nostra bussola o il toggle)
- **`z-index: 9000+`**: Modal e Popover (I menu che srotolano, anteprime PDF). Devono battere letteralmente ogni cosa disegnata sulla pagina.

---
*Prossimi Passi d'avanzamento per questa "palestra": Grid layout complessi, Intersection Observer API per comparsa dinamica allo scroll...*
