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
        genmessages = pkgs.writeScriptBin "genmessages" ''
          #!/usr/bin/env bash
          # Generate po messages from source files

          xgettext -o po/textgrabber.pot *.js
          for lang in en fr es
          do
            msgmerge -U po/$lang.po po/textgrabber.pot
            msgfmt --check po/$lang.po
          done
        '';

        show = pkgs.writeScriptBin "show" ''
          #!/usr/bin/env bash
          # Show the commands available in this flake
          # 
          system=$(uname -s | tr A-Z a-z)
          arch=$(uname -m)

          # Use nix flake show to list apps
          ${pkgs.nix}/bin/nix flake show --json 2> /dev/null | ${pkgs.jq}/bin/jq -r '
            .apps | 
            to_entries[] | 
            .key as $system | 
            .value | 
            to_entries[] | 
            "\($system): \(.key)"
            ' | grep "$arch-$system"
        '';
      in
      {
        packages.default = pkgs.stdenv.mkDerivation {
          pname = "textgrabber";
          version = "0.1.0";
          src = ./.;

          # Dependencies needed at runtime
          buildInputs = with pkgs; [
            bash
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
            gnused
          ];

          buildPhase = ''
            glib-compile-schemas schemas
            xgettext --from-code=UTF-8 -p po -o textgrabber.pot *.js
            mkdir -p locale/{fr,en,es}/LC_MESSAGES
            msgfmt po/fr.po -o locale/fr/LC_MESSAGES/textgrabber.mo
            msgfmt po/en.po -o locale/en/LC_MESSAGES/textgrabber.mo
            msgfmt po/es.po -o locale/es/LC_MESSAGES/textgrabber.mo
            chmod +x textgrabber.sh
          '';

          dontPatchShebangs = true; # Prevents Nix from modifying shebang lines

          installPhase =
            let
              extension_name = "textgrabber@pierrethibault.dev";
            in
            let
              output_dir = "$out/${extension_name}";
            in
            ''
              mkdir -p "${output_dir}"
              cp -r \
                 LICENSE \
                 locale \
                 metadata.json \
                 *.js \
                 textgrabber.sh \
                 "${output_dir}/"
              mkdir -p "${output_dir}/schemas"
              cp schemas/gschemas.compiled "${output_dir}/schemas"
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

            # For this flake itself
            jq
          ];
          shellHook = ''
            echo "Installed Tesseract languages: $(tesseract --list-langs)"
            echo "Use nix run .#show to see the commands available in this flake."
          '';
        };
        apps = {
          show = {
            type = "app";
            program = "${show}/bin/show";
          };
          genmessage = {
            type = "app";
            program = "${genmessages}/bin/genmessages";
          };
        };
      }
    );
}
