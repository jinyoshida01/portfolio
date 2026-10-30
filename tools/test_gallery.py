"""Exercise the real project-add/build workflow in an isolated, minimal site."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import re
import shutil
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class GalleryBuildTest(unittest.TestCase):
    def test_new_highlight_is_included_and_shared_software_stays_in_sync(self):
        spec = importlib.util.spec_from_file_location('portfolio_build', ROOT / 'tools/build.py')
        builder = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(builder)
        with tempfile.TemporaryDirectory(prefix='portfolio-gallery-') as folder:
            site = Path(folder)
            for name in ['index.html', 'about/index.html', 'content/about.json']:
                destination = site / name
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(ROOT / name, destination)
            shutil.copytree(ROOT / 'tools/templates', site / 'tools/templates')
            shutil.copytree(ROOT / 'assets/img/tools', site / 'assets/img/tools')
            for project in (ROOT / 'work').glob('*/project.json'):
                destination = site / 'work' / project.parent.name
                (destination / 'images').mkdir(parents=True)
                shutil.copy2(project, destination / 'project.json')
            builder.ROOT = str(site)
            builder.WORK = str(site / 'work')
            builder.TPL = str(site / 'tools/templates')
            total = len(list((site / 'work').glob('*/project.json'))) + 1
            with contextlib.redirect_stdout(io.StringIO()):
                builder.scaffold('New gallery project')
                project_file = site / 'work/new-gallery-project/project.json'
                project = json.loads(project_file.read_text())
                project['date'] = '2099-01'
                project['title'] = 'New &amp; adaptable gallery'
                project_file.write_text(json.dumps(project))
                builder.build()
            home = (site / 'index.html').read_text()
            grid = re.search(r'<!--BUILD:work-grid-->(.*?)<!--/BUILD:work-grid-->', home, re.S)[1]
            self.assertEqual(grid.count('<article class="work__item">'), 8)
            self.assertIn('work/new-gallery-project/index.html', grid)
            self.assertLess(grid.index('New &amp; adaptable gallery'), grid.index('Duress Brochures'))
            self.assertNotIn('Everything Black MV', grid)
            self.assertIn('work work--gallery', home)
            self.assertIn('data-curved-gallery', home)
            self.assertLess(home.index('id="work"'), home.index('id="skills"'))
            self.assertIn(f'See all {total} projects', home)
            archive = (site / 'work/index.html').read_text()
            self.assertEqual(archive.count('<article class="work__item">'), total)
            self.assertIn('new-gallery-project/index.html', archive)
            self.assertIn('work work--gallery', archive)
            self.assertIn(project['summary'], archive)
            case = (site / 'work/new-gallery-project/index.html').read_text()
            self.assertIn('New &amp; adaptable gallery', case)
            self.assertNotRegex(case, r'\{\{\w+\}\}')
            about = (site / 'about/index.html').read_text()
            for page in [home, archive, case, about]:
                self.assertEqual(page.count('dither-cursor.js'), 1)
                self.assertEqual(page.count('spot-background.js'), 0)
                self.assertEqual(page.count('spot-background.css'), 0)
            pattern = r'<!--BUILD:tools-->(.*?)<!--/BUILD:tools-->'
            self.assertEqual(re.search(pattern, home, re.S)[1], re.search(pattern, about, re.S)[1])
            self.assertIn('<!--BUILD:skillsets-->', home)
            self.assertNotIn('<!--BUILD:skillsets-->', about)
            self.assertIn('data-split>SKILLS</h2>', home)
            self.assertIn('data-split>SOFTWARE</h2>', about)


if __name__ == '__main__':
    unittest.main()
