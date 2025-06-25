{
  description = "TextGrabber GNOME Shell Extension";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        tesseractLanguages = [
          "afr"
          "sqi"
          "amh"
          "ara"
          "hye"
          "aze"
          "eus"
          "bel"
          "ben"
          "bos"
          "bul"
          "mya"
          "cat"
          "ceb"
          "chr"
          "chi_sim"
          "chi_tra"
          "hrv"
          "ces"
          "dan"
          "nld"
          "eng"
          "epo"
          "est"
          "fin"
          "fra"
          "glg"
          "kat"
          "deu"
          "ell"
          "guj"
          "heb"
          "hin"
          "hun"
          "isl"
          "ind"
          "ita"
          "jpn"
          "kan"
          "khm"
          "kor"
          "lao"
          "lav"
          "lit"
          "mkd"
          "msa"
          "mal"
          "mlt"
          "mar"
          "nep"
          "nor"
          "fas"
          "pol"
          "por"
          "pan"
          "ron"
          "rus"
          "srp"
          "sin"
          "slk"
          "slv"
          "spa"
          "swa"
          "swe"
          "tam"
          "tel"
          "tha"
          "bod"
          "tur"
          "ukr"
          "urd"
          "vie"
          "cym"
          "yid"
        ];
      in
      {
        packages.default = pkgs.stdenv.mkDerivation {
          pname = "textgrabber";
          version = "0.1.0";
          src = ./.;

          # Dependencies needed at runtime
          buildInputs = with pkgs; [
            glib
            gettext
            (tesseract4.override { enableLanguages = tesseractLanguages; })
            gnome-screenshot
            wl-clipboard
            xsel
          ];

          # Dependencies needed at build time
          nativeBuildInputs = with pkgs; [
            glib
            gettext
          ];

          # Script to run before build (active in the current directory)
          buildPhase = ''
            glib-compile-schemas schemas
            xgettext --from-code=UTF-8 -p po -o textgrabber.pot *.js
            mkdir -p locale/{fr,en,es}/LC_MESSAGES
            msgfmt po/fr.po -o locale/fr/LC_MESSAGES/textgrabber.mo
            msgfmt po/en.po -o locale/en/LC_MESSAGES/textgrabber.mo
            msgfmt po/es.po -o locale/es/LC_MESSAGES/textgrabber.mo
            chmod +x textgrabber.sh
          '';

          # Script to run install phase
          installPhase =
            let
              extension_name = "textgrabber@pierrethibault.dev";
            in
            let
              output_dir = "$out/${extension_name}";
            in
            ''
              mkdir -p "${output_dir}"
              cp -r extension.js \
                 icon.png \
                 LICENSE \
                 locale \
                 metadata.json \
                 po \
                 prefs.js \
                 textgrabber.sh \
                 schemas \
                 "${output_dir}/"
              echo "Extension produced at: ${output_dir}"
              # gnome-extensions enable textgrabber@pierrethibault.dev
            '';

          meta = with pkgs.lib; {
            description = "A GNOME Extension to grab text on the screen using OCR.";
            license = licenses.gpl3;
            platforms = platforms.all;
            maintainers = [ "Pierre-Thibault" ];
          };
        };

        # Packages needed to develop, invoked by nix develop
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            glib
            gettext
            (tesseract4.override { enableLanguages = tesseractLanguages; })
            gnome-screenshot
            wl-clipboard
            xsel
          ];
          shellHook = ''
            echo "Installed Tesseract languages: $(tesseract --list-langs)"
          '';
        };
      }
    );
}
