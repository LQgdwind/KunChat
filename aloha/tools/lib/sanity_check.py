import os
import pwd
import sys


def check_venv(filename: str) -> None:
    if os.path.basename(sys.prefix) != "aloha-py3-venv":
        print(f"You need to run {filename} inside a Aloha dev environment.")
        user_id = os.getuid()
        user_name = pwd.getpwuid(user_id).pw_name

        print(
            "You can `source /srv/aloha-py3-venv/bin/activate` "
            "to enter the development environment."
        )

        if user_name != "vagrant" and user_name != "alohadev":
            print()
            print("If you are using Vagrant, first run `vagrant ssh` to enter the Vagrant guest.")
        sys.exit(1)
