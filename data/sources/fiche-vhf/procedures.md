# VHF : voies, procédures d'appel et SMDSM

- Référence : fiche-vhf
- Version consultée le : 2026-09-04
- Autorité : Union internationale des télécommunications, Règlement des
  radiocommunications, appendices 14 (alphabet phonétique) et 18 (voies du
  service mobile maritime en ondes métriques) ; chapitre IV de la convention
  SOLAS pour le SMDSM.
- Programme : arrêté du 28 septembre 2007, art. 1er § 1.2, tiret
  « connaissances élémentaires du service mobile maritime, du système mondial
  de détresse et de sécurité en mer (SMSDM) et du bon usage d'une station
  radioélectrique fonctionnant dans la gamme des ondes métriques (VHF) ».

## Nature de cette fiche

Ce document n'est pas un texte réglementaire extrait par machine. Le Règlement
des radiocommunications de l'UIT n'est pas ouvert et la division 219, qui traite
du SMDSM, exclut la plaisance à son article 219-01 : ce serait le mauvais droit
pour le candidat. Cette fiche est donc une mise en forme écrite de la pratique
radio, à vérifier contre le Règlement des radiocommunications et les
publications des CROSS.

Ce qui relève du droit français est ailleurs, et les questions le citent
directement : l'obligation de certificat est à l'article 1er de l'arrêté du
18 mai 2005 ; la licence de station, le MMSI et l'ASN sont à l'article 240-2.20
de la division 240 ; l'emport d'une VHF selon la distance d'un abri est aux
articles 240-2.04 à 240-2.06 ; les signaux de détresse sont à l'annexe IV du
RIPAM.

---

## Les voies à connaître

- **Canal 16**, 156,800 MHz : voie internationale de détresse, d'urgence et
  d'appel. On y lance l'appel, puis on bascule sur une voie de travail pour la
  conversation. Elle se garde libre.
- **Canal 70** : appel sélectif numérique (ASN) seulement. Aucune phonie n'y
  passe, jamais : c'est une voie de données.
- **Canal 6** : voie de sécurité, coordination des opérations de recherche et
  de sauvetage entre navires et aéronefs.
- **Canaux 9, 12, 14** et voisins : voies portuaires, capitaineries.
- **Canaux 72, 77** et voisins : voies de travail entre navires.

La VHF marine porte à vue, un peu au-delà de l'horizon optique. La portée dépend
donc de la hauteur des antennes, pas de la puissance : d'un bateau à l'autre
elle est de quelques milles, vers une station côtière haut perchée elle atteint
plusieurs dizaines de milles. Une VHF fixe émet au plus 25 W, une portative 6 W.

## Les trois signaux, par ordre de priorité

1. **MAYDAY** — détresse. Un danger grave et imminent menace le navire ou une
   personne, et une assistance immédiate est demandée. Prononcé trois fois.
   MAYDAY prime sur tout autre trafic ; le silence radio s'impose à tous.
2. **PAN PAN** — urgence. Un message urgent concerne la sécurité du navire ou
   d'une personne, sans danger imminent : avarie de moteur au large, blessé à
   bord dont l'état n'est pas critique, homme à la mer récupéré.
3. **SÉCURITÉ** — sécurité. Un message concerne la sécurité de la navigation ou
   un avertissement météorologique : c'est l'annonce que font les CROSS avant
   un bulletin ou un avis de coup de vent.

**MAYDAY RELAY** est le relais, par un navire ou une station, d'un message de
détresse émis par un autre et resté sans réponse.

## Le message de détresse

Sur le canal 16, dans cet ordre :

- MAYDAY, MAYDAY, MAYDAY
- ICI, puis le nom du navire, trois fois, et son MMSI ou son indicatif
- MAYDAY, le nom du navire une fois
- la position, en latitude et longitude ou par relèvement et distance d'un point
  connu
- la nature de la détresse
- l'assistance demandée
- le nombre de personnes à bord et tout autre renseignement utile
- À VOUS

Sur une VHF munie de l'ASN, on soulève d'abord le capot rouge et l'on maintient
la touche de détresse : l'alerte part sur le canal 70, porte le MMSI du navire
et, quand un récepteur de positionnement est raccordé, sa position. L'alerte
numérique ne remplace pas le message parlé : elle le précède, et l'on enchaîne
sur le canal 16.

## L'alphabet phonétique

Alfa, Bravo, Charlie, Delta, Echo, Foxtrot, Golf, Hotel, India, Juliett, Kilo,
Lima, Mike, November, Oscar, Papa, Quebec, Romeo, Sierra, Tango, Uniform,
Victor, Whiskey, X-ray, Yankee, Zulu.

## Identité et autorisations

Le **MMSI**, Maritime Mobile Service Identity, identifie la station en neuf
chiffres. Les trois premiers forment le MID, indicatif du pays : 226, 227 et 228
pour la France métropolitaine. Il est attribué avec la licence de station et
programmé dans l'appareil, article 240-2.20 de la division 240.

La **licence de station de navire** est l'autorisation administrative d'utiliser
une installation radioélectrique à bord. Elle est délivrée en France par
l'Agence nationale des fréquences.

Le **certificat restreint de radiotéléphoniste (CRR)** autorise la personne, non
le navire. En eaux territoriales françaises, le permis plaisance en tient lieu ;
en eaux internationales, le CRR est exigé. Une VHF portative de six watts au
plus, dépourvue d'ASN, échappe à cette obligation en eaux territoriales
françaises. Arrêté du 18 mai 2005, article 1er, paragraphes 2 et 3.

## Les zones du SMDSM

- **A1** : dans la portée d'une station côtière VHF équipée de l'ASN, en
  pratique une vingtaine à une trentaine de milles de la côte.
- **A2** : dans la portée d'une station côtière en ondes hectométriques (MF),
  hors zone A1, de l'ordre de cent à cent cinquante milles.
- **A3** : dans la couverture des satellites géostationnaires, hors A1 et A2,
  soit approximativement entre 70° de latitude nord et 70° de latitude sud.
- **A4** : tout le reste, c'est-à-dire les régions polaires, où seules les ondes
  décamétriques (HF) passent.

La plaisance côtière navigue en zone A1.

## L'organisation du sauvetage

En France, les **CROSS**, centres régionaux opérationnels de surveillance et de
sauvetage, reçoivent l'alerte et coordonnent les moyens. Ils veillent le canal
16 en permanence et sont joignables depuis un téléphone par le **196**, numéro
d'urgence maritime unique, ou par le 112.

Une fausse alerte mobilise des moyens de secours pour rien et met en danger
ceux qui en ont besoin ailleurs. Émettre un signal de détresse hors d'un cas de
détresse ou d'un besoin d'assistance est interdit par le paragraphe 2 de
l'annexe IV du RIPAM, comme l'est tout signal susceptible d'être confondu avec
l'un d'eux. Une alerte déclenchée par erreur s'annule en le disant sur le
canal 16, sans attendre.
