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
        // permet à quatre onglets de partager une seule configuration.
        descripteur.appStartPath = cheminDeDepart
        return descripteur
    }

    override func router() -> Router {
        return RouteurDuSite()
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        webView?.allowsBackForwardNavigationGestures = true
    }

    /// Ramène l'onglet à son adresse de départ. Appelé quand on retouche
    /// l'onglet déjà ouvert : c'est le geste qui sort d'une leçon.
    func revenirAuDepart() {
        guard let webView = webView else { return }
        if webView.canGoBack, let racine = webView.backForwardList.backList.first {
            webView.go(to: racine)
        }
    }
}
