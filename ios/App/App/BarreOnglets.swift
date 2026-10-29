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
        Onglet(titre: "Accueil", chemin: "/accueil", symbole: "house"),
        Onglet(titre: "Cours", chemin: "/cours", symbole: "text.book.closed"),
        Onglet(titre: "Examen", chemin: "/examen", symbole: "timer"),
        Onglet(titre: "Entraînement", chemin: "/entrainement", symbole: "target"),
        Onglet(titre: "Fiche", chemin: "/profil", symbole: "person.crop.circle")
    ]

    /// Les cinq écrans, créés d'avance. Une `EcranWeb` ne charge sa webview
    /// qu'à la première visite : l'objet seul ne coûte rien. Les garder ici
    /// laisse `selectionner(chemin:)` les retrouver, qu'ils aient des
    /// `UITab` (iPad, iOS 18) ou non.
    private lazy var ecrans: [EcranWeb] = Self.onglets.map { onglet in
        let ecran = EcranWeb()
        ecran.cheminDeDepart = onglet.chemin
        ecran.tabBarItem = Self.item(onglet)
        return ecran
    }

    private static func image(_ symbole: String, remplie: Bool = false) -> UIImage? {
        UIImage(systemName: remplie ? "\(symbole).fill" : symbole)
    }

    private static func item(_ onglet: Onglet) -> UITabBarItem {
        UITabBarItem(
            title: onglet.titre,
            image: image(onglet.symbole),
            selectedImage: image(onglet.symbole, remplie: true) ?? image(onglet.symbole)
        )
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        delegate = self
        // L'onglet courant prend l'encre de la page (DESIGN.md, « la page
        // calme ») : gris chaud en clair, blanc cassé en sombre. Le fond de la
        // barre reste au système, verre sur iOS 26, translucide avant.
        tabBar.tintColor = UIColor(named: "Accent")

        if #available(iOS 18.0, *), UIDevice.current.userInterfaceIdiom == .pad {
            // iPad : la barre latérale. UIKit la montre en largeur normale et
            // retombe seul sur la barre d'onglets en largeur compacte (Slide
            // Over, Split View étroit, fenêtre étirée de Stage Manager).
            // `tile` pousse la webview à côté de la barre au lieu de la
            // glisser dessous : la page ne se lit jamais derrière elle.
            tabs = zip(Self.onglets, ecrans).map { onglet, ecran in
                UITab(title: onglet.titre,
                      image: Self.image(onglet.symbole),
                      identifier: onglet.chemin) { _ in ecran }
            }
            mode = .tabSidebar
            sidebar.preferredLayout = .tile
            // Sur iPad la teinte se lit sur la vue, non sur `tabBar`.
            view.tintColor = UIColor(named: "Accent")
        } else {
            viewControllers = ecrans
        }

        // L'app ouvre sur l'accueil : il dit par où reprendre, et chaque
        // onglet reste à un doigt.
        selectedIndex = 0
    }

    /// Bascule vers l'onglet dont l'adresse de départ est `chemin`. Rend
    /// `false` s'il est déjà l'onglet courant, ou introuvable.
    func selectionner(chemin: String) -> Bool {
        guard let rang = ecrans.firstIndex(where: { $0.cheminDeDepart == chemin }),
              rang != selectedIndex else { return false }
        selectedIndex = rang
        return true
    }

    func tabBarController(_ tabBarController: UITabBarController,
                          shouldSelect viewController: UIViewController) -> Bool {
        retoucher(viewController)
        return true
    }

    @available(iOS 18.0, *)
    func tabBarController(_ tabBarController: UITabBarController, shouldSelectTab tab: UITab) -> Bool {
        retoucher(tab.viewController)
        return true
    }

    /// Retoucher l'onglet déjà ouvert le ramène au départ.
    private func retoucher(_ viewController: UIViewController?) {
        if let ecran = viewController as? EcranWeb, ecran === selectedViewController {
            ecran.revenirAuDepart()
        }
    }
}
