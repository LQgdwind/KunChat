# Generated by Django 2.2.10 on 2020-03-23 20:08

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("zerver", "0277_migrate_alert_word"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="userprofile",
            name="alert_words",
        ),
    ]
