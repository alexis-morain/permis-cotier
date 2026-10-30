import Capacitor
import UIKit
import WebKit

/// Un onglet : une webview sur le site embarqué, ouverte à son adresse de départ.
///
/// Deux réglages seulement, mais ce sont les deux qui font la différence entre
/// une app et un site dans une fenêtre :
///
/// - le routeur du site à la place de celui de Capacitor, sans quoi toute
///   adresse sans extension rendrait l'accueil (voir `RouteurDuSite`) ;
/// - le glissement du bord gauche pour revenir en arrière, que la barre
///   d'onglets ne remplace pas : elle change d'onglet, elle ne défait pas un
///   pas dans une leçon.
class EcranWeb: CAPBridgeViewController {
    /// L'adresse où cet onglet ouvre, par exemple `/examen`. À poser avant que
    /// la vue ne se charge : `loadView` la lit une fois pour toutes.
    var cheminDeDepart = "/"

    override func instanceDescriptor() -> InstanceDescriptor {
        let descripteur = super.instanceDescriptor()
        // Capacitor accepte un chemin de départ par instance : c'est ce qui
        // permet à cinq onglets de partager une seule configuration.
        descripteur.appStartPath = cheminDeDepart
        return descripteur
    }

    override func router() -> Router {
        return RouteurDuSite()
    }

    /// Guettent le retour à la racine : la fin du chargement, puis la hauteur
    /// que WebKit rend à la page.
    private var finDuRetour: NSKeyValueObservation?
    private var hauteurRendue: NSKeyValueObservation?

    /// Guette l'adresse de la webview : toute nouvelle page rend la barre.
    private var changementDAdresse: NSKeyValueObservation?

    /// La série qui court dans cet onglet, dite par la page quand elle cache
    /// la barre (`EcranPlugin.pleinEcran`), oubliée à chaque nouvelle adresse.
    /// Les menus du Mac s'en servent pour griser ce qui ne vaut pas.
    enum Serie { case examen, entrainement }
    var serie: Serie?

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        webView?.allowsBackForwardNavigationGestures = true
        // Le fond de la webview est celui de la page, clair ou sombre : sans
        // lui, chaque chargement montre un blanc le temps que le CSS arrive.
        // Le blanc `#ffffff` et le gris `#191919` de `--fond`, dans `global.css`.
        let fond = UIColor(named: "Fond")
        webView?.isOpaque = false
        webView?.backgroundColor = fond
        webView?.scrollView.backgroundColor = fond
        view.backgroundColor = fond
        // Le greffon maison, qui cache la barre d'onglets pendant l'examen.
        bridge?.registerPluginInstance(EcranPlugin())
        // Les bruitages, en session audio ambiante : voir `SonPlugin`.
        bridge?.registerPluginInstance(SonPlugin())
        #if targetEnvironment(macCatalyst)
        // Vibration et barre d'état : sans objet sur Mac (`GreffonsMuets`).
        bridge?.registerPluginInstance(VibrationMuettePlugin())
        bridge?.registerPluginInstance(BarreEtatMuettePlugin())
        // Liens d'un autre site : le navigateur par défaut (`GreffonsMuets`).
        bridge?.registerPluginInstance(NavigateurMacPlugin())
        // La page apprend qu'elle est sur Mac avant son premier script
        // (`surMac()` de `src/lib/cible.ts`) : la plateforme de Capacitor y
        // dit `ios`. Sur `window`, pas sur `<html>`, dont le routeur d'Astro
        // remplace les attributs à chaque navigation.
        webView?.configuration.userContentController.addUserScript(
            WKUserScript(source: "window.coquilleMac = true;", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        webView?.pageZoom = Self.zoomTexte
        #endif
        // Le web rend la barre à la fin de la série ; mais un lien suivi en
        // pleine série, ou un glissement de retour, quitte la page sans
        // repasser par lui. La coquille tient donc le dernier mot : une
        // adresse qui change, c'est une page où la barre a sa place.
        changementDAdresse = webView?.observe(\.url, options: [.new]) { [weak self] _, _ in
            guard let self = self else { return }
            DispatchQueue.main.async {
                self.serie = nil
                EcranPlugin.basculer(dans: self, cachee: false)
            }
        }
    }

    /// L'onglet revient à l'écran. Chaque onglet a sa propre webview, chargée
    /// une fois : une leçon faite dans Cours ne se voit pas dans Accueil tant
    /// qu'on ne le dit pas à la page. On lui envoie donc un événement, et c'est
    /// elle qui décide de se rafraîchir si sa progression a changé
    /// (`Coquille.astro`, `app:onglet`).
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        webView?.evaluateJavaScript("window.dispatchEvent(new Event('app:onglet'))", completionHandler: nil)
    }

    #if targetEnvironment(macCatalyst)
    /// Sur Mac le titre de la fenêtre dit où l'on est : le nom de l'onglet.
    /// Une fenêtre qui s'appelle toujours pareil ne l'apprend pas à
    /// Mission Control ni au menu Fenêtre.
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        if let titre = tabBarItem.title {
            view.window?.windowScene?.title = titre
        }
    }
    #endif

    #if targetEnvironment(macCatalyst)
    /// La taille du texte des menus du Mac (⌘+, ⌘−, ⌘0) : un zoom de page,
    /// le même pour les cinq onglets, gardé d'un lancement à l'autre. Les
    /// paliers sont ceux de Safari, à peu près.
    static let zoomsTexte: [CGFloat] = [0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2]
    private static let cleZoomTexte = "texteMac.zoom"

    static var zoomTexte: CGFloat {
        get {
            let garde = UserDefaults.standard.double(forKey: cleZoomTexte)
            return garde > 0 ? CGFloat(garde) : 1
        }
        set { UserDefaults.standard.set(Double(newValue), forKey: cleZoomTexte) }
    }

    /// Relaie à la page une commande des menus (`app:commande`) ; la page
    /// fait ce que font ses touches (`useClavier`, `quiz/effets.ts`).
    func relayer(_ nom: String) {
        let script = "window.dispatchEvent(new CustomEvent('app:commande', { detail: { nom: '\(nom)' } }))"
        webView?.evaluateJavaScript(script, completionHandler: nil)
    }

    /// Ouvre une page du site embarqué dans cet onglet, chargé ou non.
    func aller(a chemin: String) {
        loadViewIfNeeded()
        guard let base = bridge?.config.serverURL,
              let adresse = URL(string: chemin, relativeTo: base) else { return }
        webView?.load(URLRequest(url: adresse))
    }
    #endif

    /// Ramène l'onglet à son adresse de départ, puis en haut de la page.
    /// Appelé quand on retouche l'onglet déjà ouvert : c'est le geste qui
    /// sort d'une leçon, comme dans toute app iOS.
    func revenirAuDepart() {
        guard let webView = webView else { return }
        finDuRetour = nil
        hauteurRendue = nil
        guard webView.canGoBack, let racine = webView.backForwardList.backList.first else {
            webView.scrollView.setContentOffset(.zero, animated: true)
            return
        }
        // WebKit rend la racine à la hauteur où on l'avait laissée, et il le
        // fait après la fin du chargement. On attend donc ce chargement, puis
        // le premier déplacement qui suit : c'est la hauteur rendue, et on
        // remonte de là. Une seconde plus tard on ne guette plus rien, pour
        // ne jamais reprendre la main sur un défilement du doigt.
        finDuRetour = webView.observe(\.isLoading, options: [.new]) { [weak self] vue, _ in
            guard !vue.isLoading, let self = self else { return }
            self.finDuRetour = nil
            self.hauteurRendue = vue.scrollView.observe(\.contentOffset, options: [.new]) { [weak self] defilement, _ in
                guard defilement.contentOffset.y > 0 else { return }
                self?.hauteurRendue = nil
                defilement.setContentOffset(.zero, animated: true)
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in
                self?.hauteurRendue = nil
            }
        }
        webView.go(to: racine)
    }
}
