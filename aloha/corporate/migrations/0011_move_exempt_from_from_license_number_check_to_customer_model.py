# Generated by Django 3.2.4 on 2021-06-18 18:39

from django.db import migrations, models


class Migration(migrations.Migration):
    """
    We haven't set the values for this field for the relevant organizations
    as of this moment, so we can simply drop the column from CustomerPlan
    and add it to Customer without worrying about losing the values.
    """

    dependencies = [
        ("corporate", "0010_customerplan_exempt_from_from_license_number_check"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="customerplan",
            name="exempt_from_from_license_number_check",
        ),
        migrations.AddField(
            model_name="customer",
            name="exempt_from_from_license_number_check",
            field=models.BooleanField(default=False),
        ),
    ]
