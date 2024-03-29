import os
import shutil
import subprocess
import sys
import traceback
from pathlib import Path
from send2trash import send2trash
from addDependenciesPivot import add_dependencies_to_json as add_dependencies_to_json_pivot


def copy_tree(source, destination):
    print(f"Copying: {source} to {destination}")
    if os.path.exists(destination):
        shutil.rmtree(destination)
    shutil.copytree(source, destination)


def replace_file(path, content):
    if not path.parent.exists():
        path.parent.mkdir()
    with open(path, "w") as f:
        f.write(content)


def cmd(work_dir, cmd):
    print(f"\"{cmd}\" executed in \"{work_dir}\"")
    try:
        output = subprocess.check_output(
            cmd,
            cwd=work_dir,
            stderr=subprocess.STDOUT,
            shell=True).decode("utf-8")
        if output != "":
            print(output)
    except subprocess.CalledProcessError as e:
        print("")
        print("E R R O R !")
        print(e.output.decode("utf-8"))


def move_to_trash(path):
    if not os.path.exists(path):
        return
    try:
        send2trash(path)
    except PermissionError as ex:
        print(f"Cannot move ${ex.filename} to trash. Is Webstorm or something else running there?\n")
        raise Exception(f"Cannot move ${ex.filename} to trash. Is Webstorm or something else running there?", ex)


def pivot_table_merged(path_to_plugin_repo, repo_path):
    with open(path_to_plugin_repo / "PluginRegistration.ts") as f:
        plugin_registration_content = f.read()

    add_dependencies_to_json_pivot(repo_path / "frontend-html/package.json")
    replace_file(
        repo_path / "frontend-html/src/plugins/tools/PluginRegistration.ts",
        plugin_registration_content
    )
    move_to_trash(repo_path / "frontend-html/src/plugins/implementations")
    copy_tree(path_to_plugin_repo / "plugins",
              repo_path / "frontend-html/src/plugins/implementations/plugins")

    shutil.copy(path_to_plugin_repo / "plugins/package.json",
                repo_path / "frontend-html/src/plugins/implementations/plugins/src")

    cmd(repo_path / "frontend-html", "yarn")
    cmd(repo_path / "frontend-html", "yarn build")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Please provide exactly two input parameters: 1.  path_to_plugin_repo, 2. origam_repo_path\n"
              "Example: python copyPivotPluginToClient.py C:\Repos\origam-plugin-pivot-table C:\Repos\origam")
        sys.exit()

    try:
        path_to_plugin_repo = Path(sys.argv[1])
        repo_path = Path(sys.argv[2])
        pivot_table_merged(path_to_plugin_repo, repo_path)
    except:
        print("----- ERROR -----")
        traceback.print_exc(file=sys.stdout)
        print()
    finally:
        print("DONE!")
        input("Any key to exit...")
    print("DONE!")
