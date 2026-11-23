import io
import json
import struct
import tempfile
import unittest
import uuid
import zipfile
from pathlib import Path

from tools.build_addon import build_addon, is_current


ROOT = Path(__file__).resolve().parents[1]
BP = ROOT / "behavior_pack"
RP = ROOT / "resource_pack"
HELMET = "secrets_expert:stealth_helmet"


def data(path):
    return json.loads(path.read_text(encoding="utf-8"))


def png_header(path):
    with path.open("rb") as image:
        signature, size, chunk, width, height, depth, color = struct.unpack(
            ">8sI4sIIBB", image.read(26)
        )
    if (signature, size, chunk) != (b"\x89PNG\r\n\x1a\n", 13, b"IHDR"):
        raise ValueError(f"Invalid PNG header: {path}")
    return width, height, depth, color


class PackagingTests(unittest.TestCase):
    def test_manifests_link_the_two_packs_and_stable_script_api(self):
        behavior, resources = (data(pack / "manifest.json") for pack in (BP, RP))
        version = [int(part) for part in data(ROOT / "package.json")["version"].split(".")]
        ids = set()
        for pack in (behavior, resources):
            self.assertEqual(pack["format_version"], 2)
            self.assertEqual(pack["header"]["min_engine_version"], [1, 26, 40])
            for part in [pack["header"], *pack["modules"]]:
                self.assertEqual(part["version"], version)
                pack_id = uuid.UUID(part["uuid"])
                self.assertNotIn(pack_id, ids)
                ids.add(pack_id)
        self.assertEqual(behavior["header"]["name"], "Secrets Expert")
        self.assertEqual(resources["header"]["name"], "Secrets Expert – Ressourcen")
        self.assertIn({"uuid": resources["header"]["uuid"], "version": version}, behavior["dependencies"])
        self.assertEqual(resources["header"]["pack_scope"], "world")
        self.assertEqual(resources["dependencies"], [{"uuid": behavior["header"]["uuid"], "version": version}])
        self.assertIn({"module_name": "@minecraft/server", "version": "2.8.0"}, behavior["dependencies"])
        self.assertIn({"module_name": "@minecraft/server-ui", "version": "2.0.0"}, behavior["dependencies"])
        self.assertEqual([part["type"] for part in behavior["modules"]], ["data", "script"])
        self.assertEqual([part["type"] for part in resources["modules"]], ["resources"])
        self.assertTrue((BP / behavior["modules"][1]["entry"]).is_file())

    def test_helmet_and_shapeless_recipe(self):
        item = data(BP / "items/stealth_helmet.json")["minecraft:item"]
        self.assertEqual(item["description"]["identifier"], HELMET)
        self.assertEqual(item["description"]["menu_category"]["category"], "equipment")
        wearable = item["components"]["minecraft:wearable"]
        self.assertEqual(wearable["slot"], "slot.armor.head")
        self.assertIs(wearable["hides_player_location"], True)
        self.assertEqual(wearable["protection"], 0)
        self.assertNotIn("minecraft:durability", item["components"])
        recipe = data(BP / "recipes/stealth_helmet.json")["minecraft:recipe_shapeless"]
        self.assertEqual(recipe["tags"], ["crafting_table"])
        self.assertCountEqual(recipe["ingredients"], [
            {"item": "minecraft:leather_helmet"}, {"item": "minecraft:ink_sac"},
        ])
        self.assertEqual(recipe["result"], {"item": HELMET, "count": 1})

    def test_all_addon_recipes_are_available_from_the_start(self):
        recipes = sorted((BP / "recipes").glob("*.json"))
        self.assertEqual(len(recipes), 11)
        for path in recipes:
            recipe = data(path)["minecraft:recipe_shapeless"]
            self.assertEqual(recipe["unlock"], {"context": "AlwaysUnlocked"}, path.name)

    def test_helmet_hud_is_connected_to_the_head_slot_and_packaged(self):
        entry = (BP / "scripts/main.js").read_text(encoding="utf-8")
        self.assertIn("stealth-hud.js", entry)
        self.assertIn("stealthHud.update(player, system.currentTick, helmet?.typeId)", entry)
        self.assertIn("stealthHud.remove(playerId)", entry)
        self.assertTrue((RP / "ui/hud_screen.json").is_file())

    def test_localized_display_name_and_inventory_icon_are_registered(self):
        components = data(BP / "items/stealth_helmet.json")["minecraft:item"]["components"]
        key = components["minecraft:display_name"]["value"]
        expected = {"de_DE": "Tarnhelm", "en_US": "Stealth Helmet"}
        self.assertEqual(set(data(RP / "texts/languages.json")), set(expected))
        for locale, name in expected.items():
            translations = dict(
                line.split("=", 1)
                for line in (RP / f"texts/{locale}.lang").read_text(encoding="utf-8").splitlines()
                if "=" in line and not line.startswith("#")
            )
            self.assertEqual(translations[key], name)
        icon = components["minecraft:icon"]["textures"]["default"]
        uri = data(RP / "textures/item_texture.json")["texture_data"][icon]["textures"]
        self.assertEqual(png_header(RP / f"{uri}.png"), (32, 32, 8, 6))

    def test_switch_handbook_recipe_and_icon(self):
        guide = "secrets_expert:switch_guide"
        recipe = data(BP / "recipes/switch_guide.json")["minecraft:recipe_shapeless"]
        self.assertEqual(recipe["ingredients"], [{"item": "minecraft:book"}, {"item": "minecraft:redstone"}])
        self.assertEqual(recipe["result"], {"item": guide, "count": 1})
        item = data(BP / "items/switch_guide.json")["minecraft:item"]
        self.assertEqual(item["description"]["identifier"], guide)
        self.assertIn("secrets_expert:read_switch_guide", item["components"])
        key = item["components"]["minecraft:icon"]["textures"]["default"]
        texture = data(RP / "textures/item_texture.json")["texture_data"][key]["textures"]
        self.assertEqual(png_header(RP / f"{texture}.png"), (32, 32, 8, 6))

    def test_both_packs_have_the_same_square_png_icon(self):
        behavior_icon, resource_icon = (pack / "pack_icon.png" for pack in (BP, RP))
        self.assertEqual(png_header(behavior_icon)[:2], (256, 256))
        self.assertEqual(behavior_icon.read_bytes(), resource_icon.read_bytes())

    def test_end_rod_mesh_fits_its_block_and_reaches_the_wall(self):
        block = data(BP / "blocks/switch_end_rod.json")["minecraft:block"]
        model = block["components"]["minecraft:geometry"]["identifier"]
        geometries = data(RP / "models/blocks/secret_switches.geo.json")["minecraft:geometry"]
        geometry = next(geometry for geometry in geometries if geometry["description"]["identifier"] == model)
        bounds = [(-8, 8), (0, 16), (-8, 8)]
        depth = []
        for bone in geometry["bones"]:
            self.assertNotIn("rotation", bone)
            for cube in bone["cubes"]:
                self.assertNotIn("rotation", cube)
                for (lower, upper), origin, size in zip(bounds, cube["origin"], cube["size"]):
                    self.assertGreaterEqual(origin, lower)
                    self.assertLessEqual(origin + size, upper)
                depth.append((cube["origin"][2], cube["origin"][2] + cube["size"][2]))
        self.assertEqual(sorted(depth), [(-8, -7), (-7, 8)])

    def test_torches_use_a_visible_solid_shaft_and_original_texture(self):
        geometries = data(RP / "models/blocks/secret_switches.geo.json")["minecraft:geometry"]
        texture_data = data(RP / "textures/terrain_texture.json")["texture_data"]
        for variant, original, light in [
            ("torch", "torch_on", 14), ("soul_torch", "soul_torch", 10), ("copper_torch", "copper_torch", 14),
        ]:
            with self.subTest(variant=variant):
                block = data(BP / f"blocks/switch_{variant}.json")["minecraft:block"]
                components = block["components"]
                material = components["minecraft:material_instances"]["*"]
                self.assertEqual(material["render_method"], "opaque")
                self.assertIs(material["face_dimming"], False)
                self.assertEqual(material["ambient_occlusion"], 0.0)
                self.assertEqual(texture_data[material["texture"]]["textures"], f"textures/blocks/{original}")
                self.assertEqual(components["minecraft:light_emission"], light)
                model = components["minecraft:geometry"]["identifier"]
                geometry = next(geometry for geometry in geometries if geometry["description"]["identifier"] == model)
                shaft, = geometry["bones"][0]["cubes"]
                self.assertEqual(shaft["size"], [2, 10, 2])
                self.assertEqual(shaft["rotation"], [-20, 0, 0], "The tip must lean slightly away from the wall")
                self.assertEqual(shaft["pivot"][2], -5.25)
                for face in ("north", "east", "south", "west"):
                    self.assertEqual(shaft["uv"][face], {"uv": [7, 6], "uv_size": [2, 10]})

    def test_wearable_geometry_and_texture_are_linked(self):
        attachable = data(RP / "attachables/stealth_helmet.json")["minecraft:attachable"]["description"]
        self.assertIn(HELMET, attachable["item"])
        geometry = data(RP / "models/entity/stealth_helmet.geo.json")["minecraft:geometry"][0]
        self.assertEqual(attachable["geometry"]["default"], geometry["description"]["identifier"])
        size = png_header(RP / f'{attachable["textures"]["default"]}.png')[:2]
        self.assertEqual(size, (geometry["description"]["texture_width"], geometry["description"]["texture_height"]))
        self.assertEqual(geometry["bones"][0]["binding"], "'head'")

    def test_archive_has_two_valid_mcpacks_and_is_reproducible(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "secrets-expert.mcaddon"
            build_addon(output)
            first_build = output.read_bytes()
            build_addon(output)
            self.assertEqual(first_build, output.read_bytes())
            with zipfile.ZipFile(output) as addon:
                self.assertIsNone(addon.testzip())
                pack_names = {"secrets-expert-behavior.mcpack": BP, "secrets-expert-resources.mcpack": RP}
                self.assertEqual(set(addon.namelist()), set(pack_names))
                for name, source in pack_names.items():
                    with zipfile.ZipFile(io.BytesIO(addon.read(name))) as pack:
                        self.assertIsNone(pack.testzip())
                        expected = {
                            path.relative_to(source).as_posix()
                            for path in source.rglob("*")
                            if path.is_file() and not any(part.startswith(".") for part in path.relative_to(source).parts)
                        }
                        self.assertEqual(set(pack.namelist()), expected)
                        self.assertEqual(pack.read("manifest.json"), (source / "manifest.json").read_bytes())

    def test_dist_check_rejects_missing_corrupt_and_stale_artifacts(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "secrets-expert.mcaddon"
            self.assertFalse(is_current(output))
            output.write_bytes(b"not an archive")
            self.assertFalse(is_current(output))
            with zipfile.ZipFile(output, "w") as archive:
                empty_pack = io.BytesIO()
                with zipfile.ZipFile(empty_pack, "w") as pack:
                    pack.writestr("manifest.json", '{"header":{"version":[0,1,0]}}')
                archive.writestr("secrets-expert-behavior.mcpack", empty_pack.getvalue())
            self.assertFalse(is_current(output))
            build_addon(output)
            self.assertTrue(is_current(output))
