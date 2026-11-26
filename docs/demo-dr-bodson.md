# Démonstration QREDO – déroulé

1. **PC** – VS Code → *Go Live* → `?exemple` : le dossier Dupont s'affiche, QR à droite.
2. **Jauge** – décocher / cocher une maladie : le QR et le nombre d'octets changent en direct.
   Montrer « Voir le texte encodé » : anglais médical, noms de molécules (Coversyl → PERINDOPRIL).
3. **Scan** – scanner le QR de l'écran du PC avec l'appareil photo du Pixel : le texte apparaît.
4. **Fond d'écran** – modèle « Samsung Galaxy » → Télécharger → Galerie → *Définir comme fond d'écran*
   → *Écran de verrouillage*. Verrouiller le téléphone, scanner avec un autre téléphone.
5. **Transfert PC → téléphone** – sur le téléphone, appli QREDO → « Importer en scannant un QR QREDO »
   → viser le QR du PC : tous les champs se remplissent.
6. **Mode avion** – activer le mode avion sur le téléphone, rouvrir QREDO : tout fonctionne.
7. **Carte portefeuille** – « Imprimer ma carte » : format carte bancaire à découper.
8. **Code** – montrer `app/js/core/qr-text.js` (construction du texte) et `app/js/data/picklists.js`
   (listes français → anglais) : c'est là qu'un médecin peut proposer des ajouts.

## Questions à poser au Dr Bodson

- Ordre de priorité des informations dans le QR : d'accord ?
- Listes (allergies, maladies, implants, anticoagulants) : que manque-t-il ?
- QR en anglais, saisie en français : validé ?
- Mentions « DNR » / directives anticipées : comment les formuler ?
