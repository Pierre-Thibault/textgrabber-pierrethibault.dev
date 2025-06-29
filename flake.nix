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

          xgettext --from-code=UTF-8 -o po/textgrabber.pot *.js
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

        # Create the final archive to send to the Gnome Extensions website (this create an archive with the proper access right)
        genfinalarchive = pkgs.writeScriptBin "genfinalarchive" ''
          #!/usr/bin/env bash

          # Define paths
          SOURCE_DIR="result/textgrabber@pierrethibault.dev"
          ARCHIVE_DIR="./archive"
          ARCHIVE_NAME="textgrabber@pierrethibault.dev.zip"
          TEMP_DIR="/tmp/textgrabber_temp"

          # Convert ARCHIVE_DIR to an absolute path
          ARCHIVE_DIR=$(realpath "$ARCHIVE_DIR")

          # Check if the source directory exists
          if [ ! -d "$SOURCE_DIR" ]; then
              echo "Error: The directory $SOURCE_DIR does not exist."
              exit 1
          fi

          # Create the archive directory if it doesn't exist
          mkdir -p "$ARCHIVE_DIR"

          # Create a unique temporary directory using mktemp
          if ! TEMP_DIR=$(mktemp -d); then
              echo "Error: Failed to create a temporary directory"
              exit 1
          fi

          # Copy the source directory content to the temporary directory
          # Use rsync to preserve structure but ignore owner, group, and permissions
          rsync -a --no-o --no-g --no-perms "$SOURCE_DIR" "$TEMP_DIR"

          # Change the owner and group of the copied content
          chown -R pierre:users "$TEMP_DIR/textgrabber@pierrethibault.dev"

          # Add write permissions for the owner on the content
          chmod -R u+w "$TEMP_DIR/textgrabber@pierrethibault.dev"

          # Create or replace the zip archive with textgrabber@pierrethibault.dev at the root level
          cd "$TEMP_DIR" || exit 1


          # Check if the archive creation was successful
          if zip -r "$ARCHIVE_DIR/$ARCHIVE_NAME" "textgrabber@pierrethibault.dev"; then
              echo "Archive $ARCHIVE_NAME successfully created in $ARCHIVE_DIR"
          else
              echo "Error: Failed to create the archive"
              cd - >/dev/null || exit 1
              rm -rf "$TEMP_DIR"
              exit 1
          fi

          # Change the owner and group of the archive itself
          chown pierre:users "$ARCHIVE_DIR/$ARCHIVE_NAME"

          # Add write permissions for the owner of the archive
          chmod u+w "$ARCHIVE_DIR/$ARCHIVE_NAME"

          # Clean up the temporary directory
          rm -rf "$TEMP_DIR"

          # Check if the cleanup was successful
          if rm -rf "$TEMP_DIR"; then
              echo "Temporary directory successfully cleaned up."
          else
              echo "Error: Unable to clean up the temporary directory $TEMP_DIR"
              cd - >/dev/null || exit 1
              exit 1
          fi

          # Return to the initial directory
          cd - >/dev/null || exit 1
        '';
      in
      {
        packages.default = pkgs.stdenv.mkDerivation {
          pname = "textgrabber";
          version = "1.0.5";
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
                 schemas \
                 "${output_dir}/"
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
            zip
            rsync
            # For this flake itself
            jq
          ];
          shellHook = ''
            echo "Installed Tesseract languages: $(tesseract --list-langs)"
            echo "Use nix run .#show to see the commands available in this flake."
          '';
        };
        apps =
          let
            mkApp = name: pkg: {
              type = "app";
              program = "${pkg}/bin/${name}";
            };
          in
          builtins.mapAttrs mkApp {
            inherit show genmessages genfinalarchive;
          };
      }
    );
}
