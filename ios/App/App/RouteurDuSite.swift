import Capacitor
import Foundation

/// Le routeur qui sert un site statique, et non une application à page unique.
///
/// Celui de Capacitor tient tout chemin sans extension pour une route de SPA :
///
///     if pathUrl.pathExtension.isEmpty { return basePath + "/index.html" }
///
/// C'est la racine qu'il rend, pas `<chemin>/index.html`. Dans une coquille,
/// `/examen` servait donc l'accueil : l'adresse changeait, la page non — et
/// rien dans les traces ne le disait, le chargement réussissant. Le plan de
/// chantier attendait l'inverse de ce comportement ; c'est ici qu'on le corrige,
/// et non en changeant la forme du build.
///
/// L'ordre des essais :
///
///     /examen         → public/examen/index.html   build en format dossier
///                     → public/examen.html         build en format fichier
///     /visuels/x.svg  → public/visuels/x.svg       une extension : tel quel
///     /               → public/index.html
///     inconnu         → public/index.html          dernier recours
///
/// Les deux formats sont essayés à dessein : le site est construit en format
/// fichier, la coquille en format dossier, et une bascule de l'un à l'autre ne
/// doit pas casser la navigation sans qu'on s'en aperçoive.
public struct RouteurDuSite: Router {
    public var basePath: String = ""

    public init() {}

    public func route(for path: String) -> String {
        let accueil = basePath + "/index.html"
        let chemin = path.isEmpty ? "/" : path

        // Une extension : le fichier est demandé tel quel. C'est le cas des
        // visuels, des feuilles de style, des îlots et du JSON de banque.
        if !URL(fileURLWithPath: chemin).pathExtension.isEmpty {
            return basePath + chemin
        }

        let sansBarreFinale = chemin.count > 1 && chemin.hasSuffix("/")
            ? String(chemin.dropLast())
            : chemin
        if sansBarreFinale == "/" { return accueil }

        let fichiers = FileManager.default
        for candidat in ["\(sansBarreFinale)/index.html", "\(sansBarreFinale).html"] {
            if fichiers.fileExists(atPath: basePath + candidat) {
                return basePath + candidat
            }
        }

        // Une adresse qu'on ne sait pas servir rend l'accueil plutôt qu'une
        // erreur de navigateur : dans une app, une page blanche de WebKit est
        // exactement ce que la revue Apple cherche à ne pas voir.
        return accueil
    }
}
