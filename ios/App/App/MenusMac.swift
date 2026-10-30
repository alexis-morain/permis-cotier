#if targetEnvironment(macCatalyst)
import UIKit

/// La barre de menus du Mac.
///
/// Une app Mac se pilote d'abord par ses menus : chaque geste y a une ligne,
/// et chaque ligne dit son raccourci. Ce fichier pose ces lignes ; les actions
/// vivent dans `BarreOnglets` (plus bas), parce que c'est elle qui sait quel
/// onglet est devant, et qu'elle est sur la chaîne des répondeurs entre la
/// webview et l'app.
///
/// Les gestes de l'épreuve (valider, passer, quitter) ne sont pas refaits en
/// Swift : le menu les relaie à la page en `app:commande`, et la page fait ce
/// que font ses touches (`quiz/effets.ts`). Échap, lui, reste à la page : une
/// touche sans modificateur prise par le menu ne lui arriverait plus.
enum MenusMac {

    /// Les cinq onglets dans l'ordre de `BarreOnglets.onglets`, ⌘1 à ⌘5.
    private static let onglets = ["Accueil", "Cours", "Examen", "Entraînement", "Fiche"]

    static func construire(_ menus: UIMenuBuilder) {
        // Rien à mettre en forme, pas de barre d'outils, une seule fenêtre.
        menus.remove(menu: .format)
        menus.remove(menu: .toolbar)
        menus.remove(menu: .newScene)
        // Dupliquer, Déplacer, Renommer, Exporter : une app sans document.
        menus.remove(menu: .document)

        // Le Permis Côtier > Réglages…, sous « À propos ».
        let reglages = UIKeyCommand(title: "Réglages…",
                                    action: #selector(BarreOnglets.ouvrirReglages(_:)),
                                    input: ",", modifierFlags: .command)
        menus.insertSibling(UIMenu(options: .displayInline, children: [reglages]), afterMenu: .about)

        // Fichier > Nouvel examen.
        let nouvelExamen = UIKeyCommand(title: "Nouvel examen blanc",
                                        action: #selector(BarreOnglets.nouvelExamen(_:)),
                                        input: "n", modifierFlags: .command)
        menus.insertChild(UIMenu(options: .displayInline, children: [nouvelExamen]), atStartOfMenu: .file)

        // Examen, entre Édition et Présentation. Un raccourci de menu sans ⌘
        // volerait Entrée et Échap à la page, champs compris. « Valider » n'en
        // a pas : la webview garde ⌘↩ pour elle (vu à l'écran le 30 octobre),
        // et Entrée valide déjà dans la page.
        let examen = UIMenu(title: "Examen", identifier: .examen, children: [
            UICommand(title: "Valider", action: #selector(BarreOnglets.validerQuestion(_:))),
            UIKeyCommand(title: "Passer la question", action: #selector(BarreOnglets.passerQuestion(_:)),
                         input: UIKeyCommand.inputRightArrow, modifierFlags: .command),
            UIKeyCommand(title: "Quitter l’examen", action: #selector(BarreOnglets.quitterSerie(_:)),
                         input: ".", modifierFlags: .command)
        ])
        menus.insertSibling(examen, afterMenu: .edit)

        // Présentation : la barre latérale, les onglets, la taille du texte.
        let laterale = UIKeyCommand(title: "Masquer la barre latérale",
                                    action: #selector(BarreOnglets.basculerBarreLaterale(_:)),
                                    input: "s", modifierFlags: [.command, .control])
        let allerA = onglets.enumerated().map { rang, titre in
            UIKeyCommand(title: titre, action: #selector(BarreOnglets.allerALOnglet(_:)),
                         input: "\(rang + 1)", modifierFlags: .command, propertyList: rang)
        }
        let texte = [
            UIKeyCommand(title: "Agrandir le texte", action: #selector(BarreOnglets.agrandirTexte(_:)),
                         input: "+", modifierFlags: .command),
            UIKeyCommand(title: "Réduire le texte", action: #selector(BarreOnglets.reduireTexte(_:)),
                         input: "-", modifierFlags: .command),
            UIKeyCommand(title: "Taille réelle", action: #selector(BarreOnglets.tailleReelle(_:)),
                         input: "0", modifierFlags: .command)
        ]
        // Chaque bloc se pose en tête du menu. Un bloc en ligne dans un autre
        // disparaît, `insertSibling` après un bloc en ligne aussi, et
        // `replaceChildren` sur Présentation fait lever une exception à UIKit
        // (vus le 30) : trois `insertChild`, rien d'autre.
        menus.insertChild(UIMenu(options: .displayInline, children: [laterale]), atStartOfMenu: .view)
        menus.insertChild(UIMenu(options: .displayInline, children: allerA), atStartOfMenu: .view)
        menus.insertChild(UIMenu(options: .displayInline, children: texte), atStartOfMenu: .view)

        // Aide : le site, et le signalement. L'aide d'Apple n'a rien à dire
        // d'une app sans livre d'aide.
        menus.replaceChildren(ofMenu: .help) { _ in [
            UICommand(title: "Le site lepermiscotier.fr", action: #selector(BarreOnglets.ouvrirLeSite(_:))),
            UICommand(title: "Signaler une erreur…", action: #selector(BarreOnglets.signalerUneErreur(_:)))
        ] }
    }
}

extension UIMenu.Identifier {
    static let examen = UIMenu.Identifier("fr.lepermiscotier.app.examen")
}

/// Les actions des menus. Une commande dont l'action ne vaut pas à cet
/// instant est grisée (`canPerformAction`) ; celles dont le titre dépend de
/// l'état le prennent dans `validate`.
extension BarreOnglets {

    private var ecranCourant: EcranWeb? { selectedViewController as? EcranWeb }

    override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
        switch action {
        case #selector(validerQuestion(_:)):
            return ecranCourant?.serie != nil
        case #selector(passerQuestion(_:)):
            return ecranCourant?.serie == .examen
        case #selector(quitterSerie(_:)):
            return ecranCourant?.serie != nil
        case #selector(agrandirTexte(_:)):
            return EcranWeb.zoomTexte < EcranWeb.zoomsTexte.last!
        case #selector(reduireTexte(_:)):
            return EcranWeb.zoomTexte > EcranWeb.zoomsTexte.first!
        case #selector(tailleReelle(_:)):
            return EcranWeb.zoomTexte != 1
        default:
            return super.canPerformAction(action, withSender: sender)
        }
    }

    override func validate(_ command: UICommand) {
        super.validate(command)
        switch command.action {
        case #selector(quitterSerie(_:)):
            command.title = ecranCourant?.serie == .entrainement ? "Quitter la série" : "Quitter l’examen"
        case #selector(basculerBarreLaterale(_:)):
            command.title = sidebar.isHidden ? "Afficher la barre latérale" : "Masquer la barre latérale"
        case #selector(allerALOnglet(_:)):
            command.state = (command.propertyList as? Int) == selectedIndex ? .on : .off
        default:
            break
        }
    }

    @objc func ouvrirReglages(_ sender: Any?) {
        // Les Réglages sont une page de la Fiche, avec son retour : ⌘, ouvre
        // l'onglet et y pose la page.
        guard let fiche = ecrans.first(where: { $0.cheminDeDepart == "/profil" }) else { return }
        selectedViewController = fiche
        fiche.aller(a: "/parametres")
    }

    @objc func nouvelExamen(_ sender: Any?) {
        // L'onglet Examen tel qu'il est : un examen commencé y reste, à
        // reprendre ou à arrêter ; sinon l'écran de départ.
        guard let examen = ecrans.first(where: { $0.cheminDeDepart == "/examen" }) else { return }
        let dejaDevant = examen === selectedViewController
        selectedViewController = examen
        if dejaDevant, examen.serie == nil { examen.revenirAuDepart() }
    }

    @objc func validerQuestion(_ sender: Any?) { ecranCourant?.relayer("valider") }
    @objc func passerQuestion(_ sender: Any?) { ecranCourant?.relayer("passer") }
    @objc func quitterSerie(_ sender: Any?) { ecranCourant?.relayer("quitter") }

    @objc func basculerBarreLaterale(_ sender: Any?) {
        sidebar.isHidden.toggle()
    }

    @objc func allerALOnglet(_ sender: UICommand) {
        guard let rang = sender.propertyList as? Int, ecrans.indices.contains(rang) else { return }
        selectedViewController = ecrans[rang]
    }

    @objc func agrandirTexte(_ sender: Any?) { changerLeZoom(de: 1) }
    @objc func reduireTexte(_ sender: Any?) { changerLeZoom(de: -1) }
    @objc func tailleReelle(_ sender: Any?) { poserLeZoom(1) }

    private func changerLeZoom(de pas: Int) {
        let paliers = EcranWeb.zoomsTexte
        let ici = paliers.firstIndex(where: { $0 >= EcranWeb.zoomTexte }) ?? paliers.count - 1
        poserLeZoom(paliers[max(0, min(paliers.count - 1, ici + pas))])
    }

    /// Le même zoom pour les cinq onglets, gardé d'un lancement à l'autre.
    private func poserLeZoom(_ zoom: CGFloat) {
        EcranWeb.zoomTexte = zoom
        ecrans.filter(\.isViewLoaded).forEach { $0.webView?.pageZoom = zoom }
    }

    @objc func ouvrirLeSite(_ sender: Any?) {
        guard let site = URL(string: "https://lepermiscotier.fr") else { return }
        UIApplication.shared.open(site)
    }

    @objc func signalerUneErreur(_ sender: Any?) {
        // La page du signalement, dans l'onglet courant : elle prépare le
        // courrier à `contact@`, comme depuis une question.
        ecranCourant?.aller(a: "/signaler")
    }
}
#endif
