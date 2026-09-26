import Capacitor
import UIKit

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

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        webView?.allowsBackForwardNavigationGestures = true
        // Le greffon maison, qui cache la barre d'onglets pendant l'examen.
        bridge?.registerPluginInstance(EcranPlugin())
    }

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
