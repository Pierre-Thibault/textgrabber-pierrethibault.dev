{
  description = "TextGrabber GNOME Shell Extension";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    { nixpkgs, flake-utils }:
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
            gnome.gnome-shell
            glib
            gettext
            (tesseract4.override { enableLanguages = tesseractLanguages; })
            gnome.gnome-screenshot
            wl-clipboard
            xsel
          ];

          # Dependencies needed at build time
          nativeBuildInputs = with pkgs; [
            glib
            gettext
          ];

          # Script to run when nix build is invocated
          buildPhase = ''
            ./schemas/glib-compile-schemas.sh
            chmod +x textgrabber.sh
            mkdir -p locale/{fr,en,es}/LC_MESSAGES
            msgfmt po/fr.po -o locale/fr/LC_MESSAGES/textgrabber.mo
            msgfmt po/en.po -o locale/en/LC_MESSAGES/textgrabber.mo
            msgfmt po/es.po -o locale/es/LC_MESSAGES/textgrabber.mo
          '';

          # Script to run install phase
          installPhase =
            let
              extension_name = "textgrabber@pierre.thibault@pierrethibault.dev";
            in
            let
              output_dir = "~/.local/share/gnome-shell/extensions/${extension_name}";
            in
            ''
              mkdir -p "${output_dir}"
              cp -r *.png *.js *.sh metadata.json schemas locale "${output_dir}/"
              gnome-extensions enable textgrabber@pierrethibault.dev
            '';

          meta = with pkgs.lib; {
            description = "A GNOME Extension to grab text on the screen using OCR.";
            license = licenses.gpl3;
            platforms = platforms.all;
            maintainers = [ "pierrethibault" ];
          };
        };

        # Packages needed to develop, invoked by nix develop
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            gnome.gnome-shell
            glib
            gettext
            nodejs
            gnome.gnome-shell-extensions
            gnome.gnome-tweaks
            (tesseract4.override { enableLanguages = tesseractLanguages; })
            gnome.gnome-screenshot
            wl-clipboard
            xsel
          ];
        };

        shellHook = ''
          echo "Installed Tesseract languages: $(tesseract --list-langs)"
        '';
      }
    );
}
