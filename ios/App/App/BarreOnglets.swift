import UIKit

/// La barre d'onglets native.
///
/// C'est la pièce du dossier 4.2. La ligne directrice d'Apple rejette ce qui
/// n'est « pas suffisamment différent d'une navigation dans Safari », et le
/// signal que les relecteurs citent est une navigation native : une barre
/// d'onglets iOS qui pilote le contenu, pas un menu dessiné en HTML. La `<nav>`
/// du site est d'ailleurs masquée dans le build « app » — les deux se
/// répondent, il n'y a jamais deux navigations à l'écran.
///
/// Chaque onglet a sa propre webview, créée à la première visite : un onglet
/// qu'on n'ouvre pas ne coûte rien, et l'examen commencé dans le sien survit
/// à un passage par le cours. Retoucher l'onglet déjà ouvert le ramène à son
/// adresse de départ, ce qui est le geste pour sortir d'une leçon.
final class BarreOnglets: UITabBarController, UITabBarControllerDelegate {

    private struct Onglet {
        let titre: String
        let chemin: String
        let symbole: String
    }

    /// Les quatre entrées, dans l'ordre où on apprend : le cours d'abord,
    /// l'épreuve ensuite, la révision par thème, et où on en est.
    private static let onglets = [
        Onglet(titre: "Cours", chemin: "/cours", symbole: "text.book.closed"),
        Onglet(titre: "Examen", chemin: "/examen", symbole: "checkmark.seal"),
        Onglet(titre: "Entraînement", chemin: "/entrainement", symbole: "target"),
        Onglet(titre: "Progression", chemin: "/", symbole: "chart.bar")
    ]

    override func viewDidLoad() {
        super.viewDidLoad()
        delegate = self

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

        // L'app ouvre sur le cours : c'est par là qu'on commence quand on part
        // de zéro, et l'examen blanc reste à un doigt.
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
