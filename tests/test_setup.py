from pathlib import Path


def test_map_file_shape_and_places() -> None:
    lines = Path("data/map.txt").read_text().splitlines()
    assert len(lines) == 6
    assert all(len(line) == 9 for line in lines)
    text = "".join(lines)
    for letter in "KBT":
        assert letter in text
