import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        // La racine est la barre d'onglets, pas une webview seule. Aucun
        // storyboard principal : `Info.plist` n'en déclare plus, sans quoi UIKit
        // instanciait une sixième `EcranWeb` depuis `Main.storyboard` avant
        // d'arriver ici, pour la jeter. C'est le seul endroit où l'écran de
        // départ se pose. L'écran de lancement, lui, reste `LaunchScreen`.
        window?.rootViewController = BarreOnglets()
        window?.makeKeyAndVisible()
        #if targetEnvironment(macCatalyst)
        reglerLaFenetre(windowScene)
        #endif

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    #if targetEnvironment(macCatalyst)
    func sceneDidBecomeActive(_ scene: UIScene) {
        guard let windowScene = scene as? UIWindowScene else { return }
        poserLaTailleDeDepart(windowScene)
    }
    #endif

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    #if targetEnvironment(macCatalyst)
    /// La fenêtre Mac. Dessous 800 × 600 points, la barre latérale et une page
    /// d'examen ne tiennent plus ensemble : c'est le plancher.
    private func reglerLaFenetre(_ scene: UIWindowScene) {
        scene.sizeRestrictions?.minimumSize = CGSize(width: 800, height: 600)
        // Une barre de titre ordinaire, avec le titre visible : il suit
        // l'onglet courant (`EcranWeb.viewDidAppear`). Pas de `NSToolbar` tant
        // que le lot des menus n'a rien à y mettre.
        scene.titlebar?.titleVisibility = .visible
        scene.title = "Le Permis Côtier"
    }

    /// Retenu une fois la taille de départ posée : ensuite la fenêtre garde ce
    /// que la personne en a fait, macOS la restaure seul.
    private static let tailleDeDepartPosee = "fenetreMac.tailleDeDepartPosee"

    /// 1100 × 780 au tout premier lancement, centrée, sans dépasser l'écran.
    /// Demandée dans `willConnectTo` ou à l'activation même, elle est
    /// défaite : la fenêtre sortait à 800 de large (vu à l'écran le 30).
    private func poserLaTailleDeDepart(_ scene: UIWindowScene) {
        let reglages = UserDefaults.standard
        guard !reglages.bool(forKey: Self.tailleDeDepartPosee) else { return }
        reglages.set(true, forKey: Self.tailleDeDepartPosee)
        let ecran = scene.screen.bounds
        let taille = CGSize(width: min(1100, ecran.width - 80), height: min(780, ecran.height - 80))
        let origine = CGPoint(x: ecran.midX - taille.width / 2, y: ecran.midY - taille.height / 2)
        // Une demi-seconde plus tard : à l'activation même, AppKit repose
        // derrière nous le cadre qu'il a gardé (`NSWindow Frame
        // MainSceneWindow`), ou sa taille par défaut.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            scene.requestGeometryUpdate(.Mac(systemFrame: CGRect(origin: origine, size: taille)))
        }
    }
    #endif
}
