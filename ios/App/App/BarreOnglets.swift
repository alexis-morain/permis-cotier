import UIKit

/// La barre d'onglets native.
///
/// C'est la pièce du dossier 4.2. La ligne directrice d'Apple rejette ce qui
/// n'est « pas suffisamment différent d'une navigation dans Safari », et le
/// signal que les relecteurs citent est une navigation native : une barre
/// d'onglets iOS qui pilote le contenu, pas un menu dessiné en HTML. La `<nav>`
/// du site est d'ailleurs masquée dans le build « app ». Les deux se
/// répondent : il n'y a jamais deux navigations à l'écran.
///
/// Chaque onglet a sa propre webview, créée à la première visite : un onglet
/// qu'on n'ouvre pas ne coûte rien, et l'examen commencé dans le sien survit
/// à un passage par le cours. Retoucher l'onglet déjà ouvert le ramène à son
/// adresse de départ puis en haut de la page, ce qui est le geste pour
/// sortir d'une leçon.
final class BarreOnglets: UITabBarController, UITabBarControllerDelegate {

    private struct Onglet {
        let titre: String
        let chemin: String
        let symbole: String
    }

    /// Les cinq entrées. L'accueil d'abord, qui dit quoi faire aujourd'hui ;
    /// puis le cours, l'épreuve, la révision par thème, et la fiche de
    /// l'élève, où il en est.
    private static let onglets = [
        Onglet(titre: "Accueil", chemin: "/", symbole: "house"),
        Onglet(titre: "Cours", chemin: "/cours", symbole: "text.book.closed"),
        Onglet(titre: "Examen", chemin: "/examen", symbole: "timer"),
        Onglet(titre: "Entraînement", chemin: "/entrainement", symbole: "target"),
        Onglet(titre: "Fiche", chemin: "/profil", symbole: "person.crop.circle")
    ]

    override func viewDidLoad() {
        super.viewDidLoad()
        delegate = self
        // La teinte de marque : marine en clair, jaune en sombre. Le fond de
        // la barre reste au système, verre sur iOS 26, translucide avant.
        tabBar.tintColor = UIColor(named: "Accent")

        viewControllers = Self.onglets.map { onglet in
            let ecran = EcranWeb()
            ecran.cheminDeDepart = onglet.chemin
            ecran.tabBarItem = UITabBarItem(
                title: onglet.titre,
                image: UIImage(systemName: onglet.symbole),
                selectedImage: UIImage(systemName: "\(onglet.symbole).fill")
                    ?? UIImage(systemName: onglet.symbole)
            )
            return ecran
        }

        // L'app ouvre sur l'accueil : il dit par où reprendre, et chaque
        // onglet reste à un doigt.
        selectedIndex = 0
    }

    func tabBarController(_ tabBarController: UITabBarController,
                          shouldSelect viewController: UIViewController) -> Bool {
        if viewController === selectedViewController,
           let ecran = viewController as? EcranWeb {
            ecran.revenirAuDepart()
        }
        return true
    }
}
