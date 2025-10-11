document.addEventListener('DOMContentLoaded', function () {
    const menuItems = document.querySelectorAll('.menu-item-has-children > a');

    menuItems.forEach(item => {
        // Ensure the link is treated as a button
        item.setAttribute('role', 'button');
        item.setAttribute('aria-haspopup', 'true');

        item.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const clickedLi = this.parentElement;

            if (clickedLi) {
                // Find all currently open menu items
                const openMenus = document.querySelectorAll('.menu-item-has-children.open');

                // Close other open menus that are not the one we clicked
                openMenus.forEach(openMenu => {
                    if (openMenu !== clickedLi) {
                        openMenu.classList.remove('open');
                        const anchor = openMenu.querySelector('a');
                        if (anchor) {
                            anchor.setAttribute('aria-expanded', 'false');
                        }
                    }
                });

                // Now, toggle the one we actually clicked
                clickedLi.classList.toggle('open');
                const isExpanded = clickedLi.classList.contains('open');
                this.setAttribute('aria-expanded', isExpanded);
            }
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function (e) {
        const openMenus = document.querySelectorAll('.menu-item-has-children.open');
        openMenus.forEach(menu => {
            if (!menu.contains(e.target)) {
                menu.classList.remove('open');
                const anchor = menu.querySelector('a');
                if(anchor) {
                    anchor.setAttribute('aria-expanded', 'false');
                }
            }
        });
    });
});
