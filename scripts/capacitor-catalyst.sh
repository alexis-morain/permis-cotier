#!/usr/bin/env bash
# Construit l'app Mac (Mac Catalyst) avec un Capacitor qui a sa tranche Mac.
#
# `capacitor-swift-pm` ne livre `Capacitor.xcframework` et `Cordova.xcframework`
# que pour l'iPhone et le simulateur. Ce script reconstruit les deux depuis le
# dépôt `ionic-team/capacitor`, à la version exacte que résout `CapApp-SPM`
# (iPhone, simulateur et Mac Catalyst), les range dans un paquet local nommé
# `capacitor-swift-pm`, et pose un espace de travail qui contient ce paquet à côté
# de `App.xcodeproj`. Xcode remplace alors, partout, le paquet distant par le
# paquet local de même identité : `CapApp-SPM` et les greffons ne bougent pas, et
# `cap sync` peut réécrire `Package.swift` sans rien casser.
#
# L'app iOS n'est pas concernée : `app-ios.yml` construit `App.xcodeproj` seul,
# avec le paquet officiel. Rien de ce que produit ce script n'entre dans le dépôt
# (`ios/App/catalyst/` est ignoré). Une version déjà construite n'est pas refaite.
#
#   scripts/capacitor-catalyst.sh            prépare (Capacitor puis espace de travail)
#   scripts/capacitor-catalyst.sh --build    prépare, puis construit l'app Mac en Debug, sans signature
#   scripts/capacitor-catalyst.sh --signe    prépare, puis construit l'app Mac signée, à lancer par `open`
#   scripts/capacitor-catalyst.sh --refaire  reconstruit Capacitor même s'il est en cache
set -euo pipefail

cd "$(dirname "$0")/.."
RACINE="$PWD"
IOS="$RACINE/ios/App"
CACHE="$IOS/catalyst"

CONSTRUIRE=0
SIGNER=0
REFAIRE=0
for arg in "$@"; do
  case "$arg" in
    --build) CONSTRUIRE=1 ;;
    --signe) SIGNER=1 ;;
    --refaire) REFAIRE=1 ;;
    *) echo "argument inconnu : $arg" >&2; exit 2 ;;
  esac
done

# --- La version ---------------------------------------------------------------
# Celle que `cap sync` a écrite dans CapApp-SPM, qui doit être celle du paquet npm
# `@capacitor/ios` : sinon le sync n'a pas été refait après une montée de version.
VERSION=$(sed -nE 's|.*capacitor-swift-pm\.git", exact: "([^"]+)".*|\1|p' "$IOS/CapApp-SPM/Package.swift")
if [[ -z "$VERSION" ]]; then
  echo "version de capacitor-swift-pm introuvable dans CapApp-SPM/Package.swift" >&2
  exit 1
fi
NPM=$(node -p "require('./node_modules/@capacitor/ios/package.json').version" 2>/dev/null || true)
if [[ -n "$NPM" && "$NPM" != "$VERSION" ]]; then
  echo "CapApp-SPM veut $VERSION, node_modules a @capacitor/ios $NPM : refaire npx cap sync ios" >&2
  exit 1
fi

PAQUET="$CACHE/$VERSION/capacitor-swift-pm"

# --- Capacitor pour trois plateformes -----------------------------------------
if [[ $REFAIRE -eq 1 || ! -f "$PAQUET/.complet" ]]; then
  echo "== Capacitor $VERSION : construction pour iPhone, simulateur et Mac Catalyst"
  TRAVAIL=$(mktemp -d)
  trap 'rm -rf "$TRAVAIL"' EXIT

  git clone --quiet --depth 1 --branch "$VERSION" \
    https://github.com/ionic-team/capacitor.git "$TRAVAIL/capacitor" 2>/dev/null

  ESPACE="$TRAVAIL/capacitor/ios/Capacitor/Capacitor.xcworkspace"
  for schema in Cordova Capacitor; do
    for dest in "generic/platform=iOS" "generic/platform=iOS Simulator" \
                "generic/platform=macOS,variant=Mac Catalyst"; do
      nom="$schema-$(echo "$dest" | tr -cd '[:alnum:]')"
      echo "   archive $schema, $dest"
      xcodebuild archive -quiet \
        -workspace "$ESPACE" -scheme "$schema" -configuration Release \
        -destination "$dest" \
        -archivePath "$TRAVAIL/archives/$nom.xcarchive" \
        -derivedDataPath "$TRAVAIL/derived" \
        SKIP_INSTALL=NO BUILD_LIBRARY_FOR_DISTRIBUTION=YES \
        CODE_SIGNING_ALLOWED=NO > "$TRAVAIL/$nom.log" 2>&1 \
        || { tail -30 "$TRAVAIL/$nom.log" >&2; exit 1; }
    done
  done

  rm -rf "$PAQUET"
  mkdir -p "$PAQUET"
  for schema in Cordova Capacitor; do
    args=()
    for archive in "$TRAVAIL"/archives/"$schema"-*.xcarchive; do
      args+=(-framework "$archive/Products/Library/Frameworks/$schema.framework")
    done
    xcodebuild -create-xcframework "${args[@]}" -output "$PAQUET/$schema.xcframework" >/dev/null
  done

  cat > "$PAQUET/Package.swift" <<EOF
// swift-tools-version:5.3
// Construit par scripts/capacitor-catalyst.sh depuis ionic-team/capacitor $VERSION.
// Même nom, mêmes produits que capacitor-swift-pm $VERSION, avec la tranche Mac Catalyst.
import PackageDescription

let package = Package(
    name: "capacitor-swift-pm",
    products: [
        .library(name: "Capacitor", targets: ["Capacitor"]),
        .library(name: "Cordova", targets: ["Cordova"])
    ],
    dependencies: [],
    targets: [
        .binaryTarget(name: "Capacitor", path: "Capacitor.xcframework"),
        .binaryTarget(name: "Cordova", path: "Cordova.xcframework")
    ]
)
EOF
  touch "$PAQUET/.complet"
else
  echo "== Capacitor $VERSION : déjà construit ($PAQUET)"
fi

# --- La signature du SDK ------------------------------------------------------
# Apple refuse à la soumission un SDK courant livré sans signature (ITMS-91065,
# 31 octobre : la 1.0 (24) rejetée pour Capacitor et Cordova). Le paquet officiel
# est signé par Ionic ; ces reconstructions le sont par qui les construit, avec
# le certificat de distribution de l'équipe. Xcode recopie la signature dans le
# dossier `Signatures` de l'archive, qu'App Store Connect lit au téléversement.
# `CAPACITOR_SIGNATURE` désigne l'identité ; sinon, la première « Apple
# Distribution » du trousseau. Sans identité, un avertissement : un build de
# développement s'en passe, `app-mac.yml` refuse d'archiver.
IDENTITE="${CAPACITOR_SIGNATURE:-$(security find-identity -v -p codesigning 2>/dev/null \
  | sed -nE 's/.*"(Apple Distribution: [^"]+)".*/\1/p' | head -1)}"
for schema in Cordova Capacitor; do
  xcf="$PAQUET/$schema.xcframework"
  if codesign -v "$xcf" 2>/dev/null; then
    continue
  elif [[ -n "$IDENTITE" ]]; then
    echo "== Signature de $schema.xcframework : $IDENTITE"
    codesign --timestamp --force --sign "$IDENTITE" "$xcf"
    codesign -v "$xcf"
  else
    echo "!! $schema.xcframework sans signature : l'App Store refusera ce build (ITMS-91065)" >&2
  fi
done

# --- L'espace de travail du Mac -----------------------------------------------
ESPACE_MAC="$CACHE/App-Mac.xcworkspace"
mkdir -p "$ESPACE_MAC"
cat > "$ESPACE_MAC/contents.xcworkspacedata" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<Workspace
   version = "1.0">
   <FileRef
      location = "group:../App.xcodeproj">
   </FileRef>
   <FileRef
      location = "group:$VERSION/capacitor-swift-pm">
   </FileRef>
</Workspace>
EOF
echo "== Espace de travail : ${ESPACE_MAC#"$RACINE"/}"

if [[ $CONSTRUIRE -eq 1 ]]; then
  echo "== Build de l'app Mac (Debug, sans signature)"
  xcodebuild build -quiet \
    -workspace "$ESPACE_MAC" -scheme App -configuration Debug \
    -destination "generic/platform=macOS,variant=Mac Catalyst" \
    -derivedDataPath "$CACHE/derived" \
    CODE_SIGNING_ALLOWED=NO
  echo "== App Mac : $(ls -d "$CACHE"/derived/Build/Products/Debug-maccatalyst/*.app)"
fi

# Signée par l'équipe, profil de développement Mac Catalyst créé au besoin : le
# Mac doit être enregistré dans le compte (il l'est, voir docs/app-mac-lot0.md).
# Même identifiant que l'app de l'App Store : les deux partagent leurs données.
if [[ $SIGNER -eq 1 ]]; then
  echo "== Build signé de l'app Mac (Debug)"
  xcodebuild build -quiet \
    -workspace "$ESPACE_MAC" -scheme App -configuration Debug \
    -destination "platform=macOS,variant=Mac Catalyst,arch=$(uname -m)" \
    -derivedDataPath "$CACHE/derived-signe" \
    -allowProvisioningUpdates
  echo "== À lancer : open $(ls -d "$CACHE"/derived-signe/Build/Products/Debug-maccatalyst/*.app)"
fi
