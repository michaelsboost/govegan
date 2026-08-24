document.addEventListener('alpine:init', function() {
  Alpine.data('goVeganApp', function() {
    return {
      // ---- State ----
      view: 'home',
      theme: 'light',
      moreOpen: false,
      openGlobalSearch: false,
      globalSearchQuery: '',
      globalSearchResults: [],
      toast: { message: '', timeout: null },
      exploreTab: 'Products',
      exploreQuery: '',
      activeFilters: [],
      recipeQuery: '',
      recipeFilters: [],
      resourceQuery: '',
      resourceCategory: 'All',
      expandedLearn: [],
      animalFilter: 'All',
      animalSearchQuery: '',
      selectedAnimal: null,
      animalDetailTab: 'overview',
      transitionPath: 'one-swap',
      transitionCompleted: [],
      favoriteIds: [],
      selectedLocation: null,
      ingredientSearchQuery: '',
      ingredientStatusFilter: 'All',
      selectedIngredient: null,
      selectedProduct: null,
      selectedRecipe: null,
      openChecker: false,
      ingredientText: '',
      ingredientResults: [],
      initialized: false,
      previousFocus: null,
      bodyOverflow: null,
      boundModalKeydownHandler: null,
      activeModalKey: null, // 'animal', 'product', 'recipe', 'ingredient', 'checker'

      // ---- Navigation Data ----
      navItems: [
        { id: 'home', label: 'Home' },
        { id: 'explore', label: 'Explore' },
        { id: 'recipes', label: 'Recipes' },
        { id: 'learn', label: 'Learn' },
        { id: 'resources', label: 'Resources' },
        { id: 'journey', label: 'My Journey' }
      ],

      mobileNavItems: [
        { id: 'home', label: 'Home', icon: '🏠' },
        { id: 'explore', label: 'Search', icon: '🔍' },
        { id: 'recipes', label: 'Recipes', icon: '🍽️' },
        { id: 'journey', label: 'Journey', icon: '🧭' },
        { id: 'favorites', label: 'Faves', icon: '❤️' }
      ],

      // ---- Data Collections ----
      animals: [],
      animalUses: [],
      products: [],
      recipes: [],
      ingredients: [],
      alternatives: [],
      everydayItems: [],
      householdLocations: [],
      nutrients: [],
      learnArticles: [],
      resources: [],
      sources: [],
      transitionPaths: [],
      transitionTasksByPath: {},

      // ---- Computed Getters ----
      get groupedSearchResults() {
        const results = this.globalSearchResults;
        const groups = { 'Animals': [], 'Products': [], 'Recipes': [], 'Ingredients': [], 'Everyday Items': [], 'Learn': [], 'Resources': [] };
        results.forEach(item => {
          if (item._type === 'animal') groups['Animals'].push(item);
          else if (item._type === 'product') groups['Products'].push(item);
          else if (item._type === 'recipe') groups['Recipes'].push(item);
          else if (item._type === 'ingredient') groups['Ingredients'].push(item);
          else if (item._type === 'everyday') groups['Everyday Items'].push(item);
          else if (item._type === 'learn') groups['Learn'].push(item);
          else if (item._type === 'resource') groups['Resources'].push(item);
        });
        return groups;
      },

      get featuredProducts() {
        return this.products.filter(p => p.featured).slice(0, 4);
      },

      get filteredExploreItems() {
        let items = this.products;
        const tab = this.exploreTab;
        if (tab === 'Whole-Food') items = items.filter(p => p.category === 'Whole-Food');
        else if (tab === 'Homemade') items = items.filter(p => p.brand === 'Homemade');
        else if (tab === 'Beyond Food') items = items.filter(p => p.category === 'Beyond Food');
        else items = items.filter(p => p.brand !== 'Homemade' && p.category !== 'Beyond Food');

        const q = this.normalizeSearchQuery(this.exploreQuery);
        if (q) {
          items = items.filter(p => {
            const searchable = [
              p.name, p.brand, p.category, p.replaces, p.description,
              p.base, p.uses, p.priceTier, ...(p.dietaryTags || [])
            ].map(value => this.normalizeSearchQuery(value)).join(' ');
            return searchable.includes(q);
          });
        }

        if (this.activeFilters.includes('budget')) items = items.filter(p => p.priceTier === 'budget');
        if (this.activeFilters.includes('high-protein')) items = items.filter(p => p.dietaryTags && p.dietaryTags.includes('high-protein'));
        if (this.activeFilters.includes('soy-free')) items = items.filter(p => p.dietaryTags && p.dietaryTags.includes('soy-free'));
        if (this.activeFilters.includes('peanut-free')) items = items.filter(p => p.dietaryTags && p.dietaryTags.includes('peanut-free'));
        if (this.activeFilters.includes('tree-nut-free')) items = items.filter(p => p.dietaryTags && p.dietaryTags.includes('tree-nut-free'));

        return items;
      },

      get resourceCategories() {
        return ['All', ...new Set(this.resources.map(resource => resource.category).filter(Boolean))];
      },

      get filteredResources() {
        const q = this.normalizeSearchQuery(this.resourceQuery);
        return this.resources.filter(resource => {
          if (this.resourceCategory !== 'All' && resource.category !== this.resourceCategory) return false;
          if (!q) return true;
          const searchable = [resource.title, resource.creator, resource.category, resource.format, resource.description, ...(resource.tags || [])]
            .map(value => this.normalizeSearchQuery(value)).join(' ');
          return searchable.includes(q);
        });
      },

      get filteredRecipes() {
        let items = this.recipes;
        const q = this.recipeQuery.toLowerCase().trim();
        if (q) {
          items = items.filter(r =>
            (r.title && r.title.toLowerCase().includes(q)) ||
            (r.description && r.description.toLowerCase().includes(q)) ||
            (r.category && r.category.toLowerCase().includes(q)) ||
            (r.ingredients && r.ingredients.some(i => i.item && i.item.toLowerCase().includes(q)))
          );
        }
        if (this.recipeFilters.length > 0) {
          items = items.filter(r => {
            return this.recipeFilters.some(f => {
              const fLower = f.toLowerCase();
              if (fLower === 'quick' && r.totalMinutes <= 30) return true;
              if (fLower === 'budget' && r.estimatedCost === 'budget') return true;
              if (r.dietaryTags && r.dietaryTags.some(t => t.toLowerCase() === fLower)) return true;
              if (r.category && r.category.toLowerCase() === fLower) return true;
              if (r.difficulty && r.difficulty.toLowerCase() === fLower) return true;
              return false;
            });
          });
        }
        return items;
      },

      get filteredAnimals() {
        let items = this.animals;
        const q = this.animalSearchQuery.toLowerCase().trim();
        if (q) {
          items = items.filter(a =>
            (a.commonName && a.commonName.toLowerCase().includes(q)) ||
            (a.singularName && a.singularName.toLowerCase().includes(q)) ||
            (a.summary && a.summary.toLowerCase().includes(q)) ||
            (a.scientificGroups && a.scientificGroups.some(g => g.toLowerCase().includes(q))) ||
            (a.industries && a.industries.some(i => i.toLowerCase().includes(q))) ||
            (a.categories && a.categories.some(c => c.toLowerCase().includes(q)))
          );
        }
        if (this.animalFilter !== 'All') {
          items = items.filter(a => a.categories && a.categories.some(c => c === this.animalFilter));
        }
        return items;
      },

      get filteredIngredientLibrary() {
        let items = this.ingredients;
        const q = this.ingredientSearchQuery.toLowerCase().trim();
        if (q) {
          items = items.filter(i =>
            (i.name && i.name.toLowerCase().includes(q)) ||
            (i.aliases && i.aliases.some(a => a.toLowerCase().includes(q))) ||
            (i.commonSources && i.commonSources.some(s => s.toLowerCase().includes(q))) ||
            (i.commonlyFoundIn && i.commonlyFoundIn.some(f => f.toLowerCase().includes(q)))
          );
        }
        if (this.ingredientStatusFilter !== 'All') {
          items = items.filter(i => i.status === this.ingredientStatusFilter);
        }
        return items;
      },

      get selectedLocationData() {
        if (!this.selectedLocation) return null;
        return this.householdLocations.find(l => l.id === this.selectedLocation) || null;
      },

      get selectedLocationItems() {
        const location = this.selectedLocationData;
        if (!location) return [];
        return this.everydayItems.filter(item => item.locationIds && item.locationIds.includes(location.id));
      },

      get selectedAnimalUses() {
        if (!this.selectedAnimal) return [];
        const animal = this.selectedAnimal;
        const uses = [];
        if (animal.useIds) {
          animal.useIds.forEach(id => {
            const use = this.animalUses.find(u => u.id === id);
            if (use) uses.push(use);
          });
        }
        this.animalUses.forEach(use => {
          if (use.animalIds && use.animalIds.includes(animal.id) && !uses.some(u => u.id === use.id)) {
            uses.push(use);
          }
        });
        return this.uniqueById(uses);
      },

      get selectedAnimalIngredients() {
        if (!this.selectedAnimal) return [];
        const animal = this.selectedAnimal;
        const ings = [];
        if (animal.ingredientIds) {
          animal.ingredientIds.forEach(id => {
            const ing = this.ingredients.find(i => i.id === id);
            if (ing) ings.push(ing);
          });
        }
        this.ingredients.forEach(ing => {
          if (ing.animalIds && ing.animalIds.includes(animal.id) && !ings.some(i => i.id === ing.id)) {
            ings.push(ing);
          }
        });
        return this.uniqueById(ings);
      },

      get selectedAnimalEverydayItems() {
        if (!this.selectedAnimal) return [];
        return this.everydayItems.filter(item => item.animalIds && item.animalIds.includes(this.selectedAnimal.id));
      },

      get selectedAnimalAlternatives() {
        if (!this.selectedAnimal) return [];
        const animal = this.selectedAnimal;
        const alts = [];
        const seenIds = new Set();

        if (animal.alternativeIds) {
          animal.alternativeIds.forEach(id => {
            if (!seenIds.has(id)) {
              const alt = this.alternatives.find(a => a.id === id);
              if (alt) { alts.push(alt); seenIds.add(id); }
            }
          });
        }

        this.alternatives.forEach(alt => {
          if (!seenIds.has(alt.id) && alt.animalIds && alt.animalIds.includes(animal.id)) {
            alts.push(alt);
            seenIds.add(alt.id);
          }
        });

        const animalUseIds = animal.useIds || [];
        this.alternatives.forEach(alt => {
          if (!seenIds.has(alt.id) && alt.useIds && alt.useIds.some(id => animalUseIds.includes(id))) {
            alts.push(alt);
            seenIds.add(alt.id);
          }
        });

        return alts;
      },

      get selectedAnimalSources() {
        if (!this.selectedAnimal) return [];
        const animal = this.selectedAnimal;
        const srcs = [];
        if (animal.sourceIds) {
          animal.sourceIds.forEach(id => {
            const src = this.sources.find(s => s.id === id);
            if (src) srcs.push(src);
          });
        }
        return this.uniqueById(srcs);
      },

      get selectedAnimalResources() {
        if (!this.selectedAnimal) return [];
        return this.resources.filter(resource => (resource.relatedAnimalIds || []).includes(this.selectedAnimal.id)).slice(0, 4);
      },

      get selectedProductResources() {
        if (!this.selectedProduct) return [];
        return this.resources.filter(resource => {
          const categories = resource.relatedProductCategories || [];
          return categories.includes('All Products') || categories.includes(this.selectedProduct.category);
        }).slice(0, 3);
      },

      get currentJourneyResources() {
        return this.resources.filter(resource => (resource.journeyPathIds || []).includes(this.transitionPath)).slice(0, 4);
      },

      getResourcesForNutrient(nutrient) {
        if (!nutrient) return [];
        return this.resources.filter(resource => (resource.relatedNutrientIds || []).includes(nutrient.id)).slice(0, 3);
      },

      getResourcesForArticle(article) {
        if (!article) return [];
        return this.resources.filter(resource => (resource.relatedArticleIds || []).includes(article.id)).slice(0, 3);
      },

      get currentTransitionTasks() {
        return this.transitionTasksByPath[this.transitionPath] || [];
      },

      get transitionProgress() {
        const tasks = this.currentTransitionTasks;
        if (tasks.length === 0) return 0;
        const done = tasks.filter((_, i) => this.transitionCompleted[i]).length;
        return done / tasks.length;
      },

      get favorites() {
        return this.favoriteIds.map(id => this.products.find(p => p.id === id)).filter(Boolean);
      },

      get isAnyModalOpen() {
        return !!(
          this.selectedAnimal ||
          this.selectedProduct ||
          this.selectedRecipe ||
          this.selectedIngredient ||
          this.openChecker
        );
      },

      // ---- Helper Methods ----
      getCollection(name) {
        return this[name] || [];
      },

      getById(collectionName, id) {
        const col = this.getCollection(collectionName);
        return col.find(item => item.id === id) || null;
      },

      getByIds(collectionName, ids) {
        if (!ids || !Array.isArray(ids)) return [];
        const col = this.getCollection(collectionName);
        return ids.map(id => col.find(item => item.id === id)).filter(Boolean);
      },

      uniqueById(items) {
        const seen = new Set();
        return items.filter(item => {
          if (!item || !item.id) return false;
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
      },

      clonePlainData(value) {
        if (typeof structuredClone === 'function') {
          try { return structuredClone(value); } catch (_) {}
        }
        return JSON.parse(JSON.stringify(value));
      },

      // ---- Theme ----
      toggleTheme() {
        const next = this.theme === 'light' ? 'dark' : 'light';
        this.theme = next;
        document.documentElement.setAttribute('data-theme', next);
        try {
          localStorage.setItem('go-vegan-theme', next);
        } catch (e) {}
      },

      loadTheme() {
        let theme = 'light';
        try {
          const saved = localStorage.getItem('go-vegan-theme');
          if (saved === 'light' || saved === 'dark') {
            theme = saved;
          } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            theme = 'dark';
          }
        } catch (e) {}
        this.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
      },

      // ---- Navigation ----
      navigate(viewId) {
        const validViews = ['home', 'explore', 'recipes', 'learn', 'resources', 'animals', 'journey', 'favorites', 'everyday', 'ingredient-library', 'nutrition', 'about'];
        if (!validViews.includes(viewId)) return;
        this.view = viewId;
        this.moreOpen = false;
        this.openGlobalSearch = false;
        this.closeAllModals();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },

      toggleMoreDrawer() {
        this.moreOpen = !this.moreOpen;
      },

      openExploreTab(tab) {
        this.exploreTab = tab;
        this.navigate('explore');
      },

      searchExplore(query) {
        const q = (query || '').trim();
        if (!q) {
          this.showToast('Please enter a search term');
          return;
        }
        this.exploreQuery = q;
        this.navigate('explore');
        this.showToast('Showing results for: ' + q);
      },

      // ---- Global Search ----
      normalizeSearchQuery(value) {
        return String(value || '')
          .toLowerCase()
          .replace(/[‐‑‒–—−_]+/g, '-')
          .replace(/\btree\s+nuts?\s+free\b/g, 'tree-nut-free')
          .replace(/\b(soy|peanut|nut|gluten|dairy|egg)\s+free\b/g, '$1-free')
          .replace(/\bhigh\s+protein\b/g, 'high-protein')
          .replace(/\s*-\s*/g, '-')
          .replace(/\s+/g, ' ')
          .trim();
      },

      performUnifiedSearch() {
        const q = this.normalizeSearchQuery(this.globalSearchQuery);
        if (!q) {
          this.globalSearchResults = [];
          return;
        }
        const results = [];

        this.animals.forEach(a => {
          const displayName = a.commonName || a.singularName || '';
          if (displayName.toLowerCase().includes(q) ||
              (a.summary && a.summary.toLowerCase().includes(q)) ||
              (a.scientificGroups && a.scientificGroups.some(g => g.toLowerCase().includes(q))) ||
              (a.categories && a.categories.some(c => c.toLowerCase().includes(q))) ||
              (a.industries && a.industries.some(i => i.toLowerCase().includes(q)))) {
            results.push({ ...a, _type: 'animal', displayName, emoji: a.emoji || '🐾' });
          }
        });

        this.products.forEach(p => {
          const displayName = (p.brand || '') + ' ' + (p.name || '');
          const searchable = [
            displayName, p.category, p.replaces, p.description,
            p.base, p.uses, p.priceTier, ...(p.dietaryTags || [])
          ].map(value => this.normalizeSearchQuery(value)).join(' ');
          if (searchable.includes(q)) {
            results.push({ ...p, _type: 'product', displayName: displayName.trim() || p.name || 'Unnamed product', emoji: p.emoji || '🌱' });
          }
        });

        this.recipes.forEach(r => {
          if ((r.title && r.title.toLowerCase().includes(q)) ||
              (r.description && r.description.toLowerCase().includes(q)) ||
              (r.category && r.category.toLowerCase().includes(q)) ||
              (r.ingredients && r.ingredients.some(i => i.item && i.item.toLowerCase().includes(q)))) {
            results.push({ ...r, _type: 'recipe', displayName: r.title || 'Unnamed recipe', emoji: r.emoji || '🍽️' });
          }
        });

        this.ingredients.forEach(i => {
          if ((i.name && i.name.toLowerCase().includes(q)) ||
              (i.aliases && i.aliases.some(a => a.toLowerCase().includes(q))) ||
              (i.commonSources && i.commonSources.some(s => s.toLowerCase().includes(q))) ||
              (i.commonlyFoundIn && i.commonlyFoundIn.some(f => f.toLowerCase().includes(q)))) {
            results.push({ ...i, _type: 'ingredient', displayName: i.name || 'Unnamed ingredient', emoji: '🧪' });
          }
        });

        this.everydayItems.forEach(e => {
          if ((e.name && e.name.toLowerCase().includes(q)) ||
              (e.description && e.description.toLowerCase().includes(q)) ||
              (e.category && e.category.toLowerCase().includes(q))) {
            results.push({ ...e, _type: 'everyday', displayName: e.name || 'Unnamed item', emoji: e.emoji || '📦' });
          }
        });

        this.learnArticles.forEach(l => {
          if ((l.title && this.normalizeSearchQuery(l.title).includes(q)) ||
              (l.content && this.normalizeSearchQuery(l.content).includes(q))) {
            results.push({ ...l, _type: 'learn', displayName: l.title || 'Unnamed article', emoji: '📖' });
          }
        });

        this.resources.forEach(resource => {
          const searchable = [resource.title, resource.creator, resource.category, resource.format, resource.description, ...(resource.tags || [])]
            .map(value => this.normalizeSearchQuery(value)).join(' ');
          if (searchable.includes(q)) {
            results.push({ ...resource, _type: 'resource', displayName: resource.title || 'Unnamed resource', emoji: resource.emoji || '🔗' });
          }
        });

        const seen = new Set();
        const deduped = results.filter(item => {
          const key = item._type + ':' + item.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        this.globalSearchResults = deduped.slice(0, 50);
      },

      handleSearchResultClick(item) {
        if (!item) return;
        if (item._type === 'animal') {
          this.openAnimalDetail(item);
        } else if (item._type === 'product') {
          this.openProduct(item);
        } else if (item._type === 'recipe') {
          this.openRecipe(item);
        } else if (item._type === 'ingredient') {
          this.openIngredientDetail(item);
        } else if (item._type === 'everyday') {
          if (item.locationIds && item.locationIds.length > 0) {
            this.selectedLocation = item.locationIds[0];
          }
          this.navigate('everyday');
          this.showToast('Showing: ' + (item.displayName || item.name));
        } else if (item._type === 'learn') {
          this.navigate('learn');
          this.expandLearnArticle(item.id);
          this.showToast('Opened: ' + (item.displayName || item.title));
        } else if (item._type === 'resource') {
          this.resourceQuery = item.title || '';
          this.resourceCategory = 'All';
          this.navigate('resources');
          this.showToast('Showing resource: ' + (item.displayName || item.title));
        }
        this.openGlobalSearch = false;
        this.globalSearchQuery = '';
      },

      // ---- Explore ----
      filterExplore() {},
      toggleFilter(filter) {
        const idx = this.activeFilters.indexOf(filter);
        if (idx >= 0) this.activeFilters.splice(idx, 1);
        else this.activeFilters.push(filter);
      },
      clearFilters() { this.activeFilters = []; },

      // ---- Recipes ----
      filterRecipes() {},
      toggleRecipeFilter(tag) {
        const idx = this.recipeFilters.indexOf(tag);
        if (idx >= 0) this.recipeFilters.splice(idx, 1);
        else this.recipeFilters.push(tag);
      },
      openRecipe(recipe) {
        if (!recipe) return;
        this.selectedRecipe = recipe;
      },

      // ---- Learn ----
      toggleLearnArticle(id) {
        const idx = this.expandedLearn.indexOf(id);
        if (idx >= 0) this.expandedLearn.splice(idx, 1);
        else this.expandedLearn.push(id);
      },
      expandLearnArticle(id) {
        if (!this.learnArticles.some(a => a.id === id)) return;
        if (!this.expandedLearn.includes(id)) {
          this.expandedLearn.push(id);
        }
        this.$nextTick(() => {
          const el = document.getElementById('learn-btn-' + id);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus();
          }
        });
      },

      // ---- Animals ----
      filterAnimals() {},
      openAnimalDetail(animal) {
        if (!animal) return;
        this.selectedAnimal = animal;
        this.animalDetailTab = 'overview';
      },
      closeAnimalDetail() {
        this.selectedAnimal = null;
      },
      selectAnimalTab(tab, event) {
        const tabs = ['overview', 'natural', 'uses', 'ingredients', 'everyday', 'alternatives', 'sources'];
        if (!tabs.includes(tab)) return;
        this.animalDetailTab = tab;
        if (event && event.target) {
          // focus already on the button
        }
      },
      handleAnimalTabKeydown(event) {
        const tabs = ['overview', 'natural', 'uses', 'ingredients', 'everyday', 'alternatives', 'sources'];
        const currentIndex = tabs.indexOf(this.animalDetailTab);
        if (currentIndex === -1) return;
        let newIndex = currentIndex;
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          newIndex = (currentIndex + 1) % tabs.length;
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        } else if (event.key === 'Home') {
          event.preventDefault();
          newIndex = 0;
        } else if (event.key === 'End') {
          event.preventDefault();
          newIndex = tabs.length - 1;
        } else {
          return;
        }
        this.animalDetailTab = tabs[newIndex];
        this.$nextTick(() => {
          const el = document.getElementById('tab-' + tabs[newIndex]);
          if (el) el.focus();
        });
      },

      // ---- Journey ----
      selectTransitionPath(pathId) {
        if (!this.transitionTasksByPath[pathId]) return;
        this.saveTransitionProgress();
        this.transitionPath = pathId;
        this.loadTransition();
      },
      saveTransitionProgress() {
        try {
          let allProgress = {};
          const stored = localStorage.getItem('go-vegan-transition-all');
          if (stored) {
            try { allProgress = JSON.parse(stored); } catch (e) {}
          }
          allProgress[this.transitionPath] = this.transitionCompleted.slice();
          localStorage.setItem('go-vegan-transition-all', JSON.stringify(allProgress));
        } catch (e) {}
      },
      loadTransition() {
        try {
          const stored = localStorage.getItem('go-vegan-transition-all');
          if (!stored) {
            const legacy = localStorage.getItem('go-vegan-transition');
            if (legacy) {
              try {
                const parsed = JSON.parse(legacy);
                if (parsed.path && Array.isArray(parsed.completed)) {
                  let allProgress = {};
                  allProgress[parsed.path] = parsed.completed.map(v => v === true);
                  localStorage.setItem('go-vegan-transition-all', JSON.stringify(allProgress));
                  localStorage.removeItem('go-vegan-transition');
                }
              } catch (e) {}
            }
          }
          const currentStored = localStorage.getItem('go-vegan-transition-all');
          if (currentStored) {
            const allProgress = JSON.parse(currentStored);
            const path = this.transitionPath;
            const tasks = this.currentTransitionTasks;
            if (allProgress[path] && Array.isArray(allProgress[path])) {
              const saved = allProgress[path];
              const normalized = tasks.map((_, i) => (i < saved.length ? saved[i] === true : false));
              this.transitionCompleted = normalized;
            } else {
              this.transitionCompleted = new Array(tasks.length).fill(false);
            }
          } else {
            this.transitionCompleted = new Array(this.currentTransitionTasks.length).fill(false);
          }
        } catch (e) {
          this.transitionCompleted = new Array(this.currentTransitionTasks.length).fill(false);
        }
      },

      // ---- Favorites ----
      toggleFavorite(product) {
        if (!product) return;
        const idx = this.favoriteIds.indexOf(product.id);
        if (idx >= 0) {
          this.favoriteIds.splice(idx, 1);
          this.showToast('Removed from favorites');
        } else {
          this.favoriteIds.push(product.id);
          this.showToast('Added to favorites ❤️');
        }
        this.saveFavorites();
      },
      isFavorite(id) {
        return this.favoriteIds.includes(id);
      },
      removeFavorite(id) {
        const idx = this.favoriteIds.indexOf(id);
        if (idx >= 0) {
          this.favoriteIds.splice(idx, 1);
          this.saveFavorites();
          this.showToast('Removed from favorites');
        }
      },
      saveFavorites() {
        try {
          localStorage.setItem('go-vegan-favorites', JSON.stringify(this.favoriteIds));
        } catch (e) {}
      },
      loadFavorites() {
        try {
          const data = localStorage.getItem('go-vegan-favorites');
          if (data) {
            const parsed = JSON.parse(data);
            let ids = [];
            if (Array.isArray(parsed)) {
              ids = parsed.map(item => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object' && item.id && typeof item.id === 'string') return item.id;
                return null;
              }).filter(Boolean);
            }
            const unique = [...new Set(ids)];
            this.favoriteIds = unique.filter(id => this.products.some(p => p.id === id));
            this.saveFavorites();
          }
        } catch (e) {
          this.favoriteIds = [];
        }
      },
      exportFavorites() {
        const favs = this.favorites;
        if (favs.length === 0) {
          this.showToast('No favorites to export');
          return;
        }
        const data = JSON.stringify(favs, null, 2);
        try {
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'go-vegan-favorites.json';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          this.showToast('Exported ' + favs.length + ' favorites');
        } catch (e) {
          this.showToast('Could not export favorites');
        }
      },
      shareProduct(product) {
        if (!product) return;
        const text = (product.brand || '') + ' ' + (product.name || '') + ' — ' + (product.category || '') + ' (Go Vegan)';
        if (navigator.share) {
          navigator.share({ title: 'Go Vegan', text: text })
            .catch((err) => {
              if (err.name === 'AbortError') return;
              this.fallbackCopy(text);
            });
        } else {
          this.fallbackCopy(text);
        }
      },
      fallbackCopy(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text)
            .then(() => this.showToast('Copied to clipboard!'))
            .catch(() => this.fallbackCopyLegacy(text));
        } else {
          this.fallbackCopyLegacy(text);
        }
      },
      fallbackCopyLegacy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          const success = document.execCommand('copy');
          if (success) {
            this.showToast('Copied to clipboard!');
          } else {
            this.showToast('Could not copy');
          }
        } catch (e) {
          this.showToast('Could not copy');
        } finally {
          document.body.removeChild(textarea);
        }
      },

      // ---- Everyday Products ----
      getAnimalNamesForProduct(item) {
        if (!item || !item.animalIds || item.animalIds.length === 0) return [];
        const names = [];
        item.animalIds.forEach(id => {
          const animal = this.animals.find(a => a.id === id);
          if (animal) {
            names.push(animal.commonName || animal.singularName || 'Unknown animal');
          }
        });
        return [...new Set(names)];
      },
      showProductAlternatives(item) {
        if (!item) return;
        const altIds = item.alternativeIds || [];
        if (altIds.length === 0) {
          this.showToast('No specific alternatives documented yet. Check Explore for options.');
          return;
        }
        const alts = this.alternatives.filter(a => altIds.includes(a.id));
        if (alts.length === 0) {
          this.showToast('No specific alternatives documented yet. Check Explore for options.');
          return;
        }
        const query = alts[0].name || alts[0].replaces || '';
        if (query) {
          this.searchExplore(query);
        } else {
          this.navigate('explore');
          this.showToast('Alternatives available in Explore');
        }
      },

      // ---- Ingredient Library ----
      filterIngredientLibrary() {},
      openIngredientDetail(ingredient) {
        if (!ingredient) return;
        this.selectedIngredient = ingredient;
      },
      getAlternativeName(id) {
        const alt = this.alternatives.find(a => a.id === id);
        return alt ? alt.name : null;
      },
      scanSelectedIngredient() {
        if (!this.selectedIngredient) return;
        const name = this.selectedIngredient.name;
        this.selectedIngredient = null;
        this.ingredientText = name;
        this.openChecker = true;
        this.$nextTick(() => {
          this.scanIngredients();
        });
      },

      // ---- Products ----
      openProduct(product) {
        if (!product) return;
        this.selectedProduct = product;
      },
      getProductStatusClass(status) {
        const map = {
          'certified-vegan': 'status-certified',
          'manufacturer-labeled-vegan': 'status-labeled',
          'homemade-vegan': 'status-labeled',
          'appears-vegan-check-label': 'status-verify',
          'verify-current-packaging': 'status-verify',
          'unknown': 'status-unknown'
        };
        return map[status] || 'status-unknown';
      },
      getProductStatusLabel(status) {
        const map = {
          'certified-vegan': 'Certified Vegan',
          'manufacturer-labeled-vegan': 'Labeled Vegan',
          'homemade-vegan': 'Homemade Vegan',
          'appears-vegan-check-label': 'Check Label',
          'verify-current-packaging': 'Verify Packaging',
          'unknown': 'Unknown'
        };
        return map[status] || 'Unknown';
      },

      // ---- Ingredient Checker ----
      normalizeIngredientTerm(term) {
        return term
          .normalize('NFKC')
          .toLowerCase()
          .replace(/['’]/g, "'")
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/^[^a-z0-9]+/, '')
          .replace(/[^a-z0-9]+$/, '');
      },

      scanIngredients() {
        const text = this.ingredientText.trim();
        if (!text) {
          this.showToast('Please enter ingredients to scan');
          this.ingredientResults = [];
          return;
        }

        const rawSegments = text.split(/[,;()\n]+/).map(s => s.trim()).filter(Boolean);
        const results = [];
        const usedIngredientIds = new Set();

        const normalizedIngredients = this.ingredients.map(ing => ({
          ...ing,
          normalizedName: this.normalizeIngredientTerm(ing.name),
          normalizedAliases: (ing.aliases || []).map(a => this.normalizeIngredientTerm(a))
        }));

        // Define boundary characters (no empty string)
        const boundaryChars = [' ', ':', '-', '/', '(', '[', '{'];

        rawSegments.forEach(segment => {
          const normalizedSeg = this.normalizeIngredientTerm(segment);
          if (!normalizedSeg) return;

          let matchedIng = null;
          let matchedTerm = segment;

          for (const ing of normalizedIngredients) {
            // Exact match
            if (ing.normalizedName === normalizedSeg) {
              matchedIng = ing;
              matchedTerm = ing.name;
              break;
            }
            if (ing.normalizedAliases.some(a => a === normalizedSeg)) {
              matchedIng = ing;
              matchedTerm = ing.aliases.find(a => this.normalizeIngredientTerm(a) === normalizedSeg) || ing.name;
              break;
            }
            // Prefix match with boundary
            let matched = false;
            for (const boundary of boundaryChars) {
              const testStr = ing.normalizedName + boundary;
              if (normalizedSeg.startsWith(testStr)) {
                matched = true;
                matchedIng = ing;
                matchedTerm = ing.name;
                break;
              }
              const aliasMatch = ing.normalizedAliases.find(a => {
                const testAlias = a + boundary;
                return normalizedSeg.startsWith(testAlias);
              });
              if (aliasMatch) {
                matched = true;
                matchedIng = ing;
                matchedTerm = ing.aliases.find(a => this.normalizeIngredientTerm(a) === aliasMatch) || ing.name;
                break;
              }
            }
            if (matched) break;
          }

          if (matchedIng && !usedIngredientIds.has(matchedIng.id)) {
            usedIngredientIds.add(matchedIng.id);
            results.push({
              term: matchedTerm,
              status: matchedIng.status || 'unknown',
              label: this.getStatusLabel(matchedIng.status),
              note: matchedIng.commonSources ? 'Source: ' + matchedIng.commonSources.slice(0, 2).join(', ') : ''
            });
          }
        });

        if (results.length === 0) {
          results.push({
            term: 'No flagged ingredients found',
            status: 'clear',
            label: 'Unflagged',
            note: 'Verify processing aids and undisclosed sources.'
          });
        }

        this.ingredientResults = results;
        if (results.some(r => r.status === 'animal-derived' || r.status === 'usually-animal-derived')) {
          this.showToast('⚠️ Some ingredients may be animal‑derived');
        } else {
          this.showToast('✅ No obvious animal ingredients found — verify further');
        }
      },

      getStatusLabel(status) {
        const map = {
          'animal-derived': 'Animal-derived',
          'usually-animal-derived': 'Usually animal-derived',
          'may-be-animal-derived': 'May be animal-derived',
          'usually-plant-or-microbial': 'Usually plant or microbial',
          'vegan': 'Vegan',
          'unknown': 'Unknown'
        };
        return map[status] || status;
      },

      getStatusClass(status) {
        const map = {
          'animal-derived': 'animal',
          'usually-animal-derived': 'usually',
          'may-be-animal-derived': 'maybe',
          'usually-plant-or-microbial': 'clear',
          'vegan': 'clear',
          'unknown': 'unknown'
        };
        return map[status] || 'unknown';
      },

      // ---- Modal Lifecycle ----
      closeAllModals() {
        this.selectedAnimal = null;
        this.selectedProduct = null;
        this.selectedRecipe = null;
        this.selectedIngredient = null;
        this.openChecker = false;
      },

      getActiveModalKey() {
        if (this.selectedAnimal) return 'animal';
        if (this.selectedProduct) return 'product';
        if (this.selectedRecipe) return 'recipe';
        if (this.selectedIngredient) return 'ingredient';
        if (this.openChecker) return 'checker';
        return null;
      },

      getVisibleModal() {
        const overlays = document.querySelectorAll('.modal-overlay');
        for (const el of overlays) {
          if (el.offsetParent !== null) {
            return el;
          }
        }
        return null;
      },

      focusModalContent() {
        const modal = this.getVisibleModal();
        if (!modal) return;
        const focusable = modal.querySelectorAll('button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])');
        const visible = Array.from(focusable).filter(el => el.offsetParent !== null && !el.disabled);
        if (visible.length > 0) {
          visible[0].focus();
        } else {
          const content = modal.querySelector('.modal-content');
          if (content) {
            content.setAttribute('tabindex', '-1');
            content.focus();
          }
        }
      },

      synchronizeModalState() {
        const nowOpen = this.isAnyModalOpen;
        const newKey = this.getActiveModalKey();

        if (nowOpen) {
          // If this is the first modal opening, save page state and attach listener
          if (!this.previousFocus && !this.boundModalKeydownHandler) {
            this.previousFocus = document.activeElement;
            this.bodyOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            this.boundModalKeydownHandler = this.handleModalKeydown.bind(this);
            document.addEventListener('keydown', this.boundModalKeydownHandler);
          }
          // Update active key and focus the modal content after DOM update
          this.activeModalKey = newKey;
          this.$nextTick(() => {
            this.focusModalContent();
          });
        } else {
          // No modal open: cleanup
          if (this.boundModalKeydownHandler) {
            document.removeEventListener('keydown', this.boundModalKeydownHandler);
            this.boundModalKeydownHandler = null;
          }
          document.body.style.overflow = this.bodyOverflow || '';
          if (this.previousFocus && this.previousFocus.focus) {
            this.previousFocus.focus();
            this.previousFocus = null;
          }
          this.bodyOverflow = null;
          this.activeModalKey = null;
        }
      },

      handleModalKeydown(event) {
        if (!this.isAnyModalOpen) return;

        if (event.key === 'Escape') {
          if (this.selectedAnimal) {
            this.closeAnimalDetail();
          } else if (this.selectedProduct) {
            this.selectedProduct = null;
          } else if (this.selectedRecipe) {
            this.selectedRecipe = null;
          } else if (this.selectedIngredient) {
            this.selectedIngredient = null;
          } else if (this.openChecker) {
            this.openChecker = false;
          }
          event.preventDefault();
          return;
        }

        if (event.key === 'Tab') {
          const modal = this.getVisibleModal();
          if (!modal) return;

          const focusable = modal.querySelectorAll('button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])');
          const visible = Array.from(focusable).filter(el => el.offsetParent !== null && !el.disabled);

          if (visible.length === 0) {
            event.preventDefault();
            return;
          }

          const first = visible[0];
          const last = visible[visible.length - 1];
          const active = document.activeElement;

          // If focus is outside the modal, focus first
          if (!modal.contains(active)) {
            event.preventDefault();
            first.focus();
            return;
          }

          if (event.shiftKey) {
            if (active === first) {
              event.preventDefault();
              last.focus();
            }
          } else {
            if (active === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }
      },

      // ---- Toast ----
      showToast(msg) {
        if (this.toast.timeout) {
          clearTimeout(this.toast.timeout);
        }
        this.toast.message = msg;
        this.toast.timeout = setTimeout(() => {
          this.toast.message = '';
        }, 3500);
      },

      // ---- Init ----
      initApp() {
        if (this.initialized) return;
        this.initialized = true;

        // Clone the global data to avoid mutating the original
        let rawData = {};
        if (window.GoVeganData) {
          rawData = this.clonePlainData(window.GoVeganData);
        }

        // Assign from cloned data or fallback
        if (rawData.animals) {
          this.animals = rawData.animals || [];
          this.animalUses = rawData.animalUses || [];
          this.products = rawData.products || [];
          this.recipes = rawData.recipes || [];
          this.ingredients = rawData.ingredients || [];
          this.alternatives = rawData.alternatives || [];
          this.everydayItems = rawData.everydayItems || [];
          this.householdLocations = rawData.householdLocations || [];
          this.nutrients = rawData.nutrients || [];
          this.learnArticles = rawData.learnArticles || [];
          this.resources = rawData.resources || [];
          this.sources = rawData.sources || [];
          this.transitionPaths = rawData.transitionPaths || [];
          this.transitionTasksByPath = rawData.transitionTasksByPath || {};
        } else {
          // Minimal fallback
          this.animals = [];
          this.animalUses = [];
          this.products = [];
          this.recipes = [];
          this.ingredients = [];
          this.alternatives = [];
          this.everydayItems = [];
          this.householdLocations = [];
          this.nutrients = [];
          this.learnArticles = [];
          this.resources = [];
          this.sources = [];
          this.transitionPaths = [
            { id: 'one-swap', label: 'One swap' },
            { id: 'seven-day', label: '7‑day intro' },
            { id: 'thirty-day', label: '30‑day transition' },
            { id: 'whole-food', label: 'Whole‑food' }
          ];
          this.transitionTasksByPath = {
            'one-swap': ['Pick one product to replace', 'Find a vegan alternative', 'Try it this week'],
            'seven-day': ['Day 1: Try plant milk', 'Day 2: Vegan breakfast', 'Day 3: Meat alternative', 'Day 4: Hidden ingredients', 'Day 5: Vegan cheese', 'Day 6: Nutrition basics', 'Day 7: Reflect'],
            'thirty-day': ['Days 1–7: Discover', 'Days 8–14: Replace', 'Days 15–21: Build confidence', 'Days 22–30: Sustain'],
            'whole-food': ['Stock whole grains', 'Buy legumes', 'Add fresh veg', 'Use nuts & seeds', 'Cook from scratch']
          };
        }

        // Normalize the cloned data
        this.normalizeData();

        // Initialize theme, favorites, journey
        this.loadTheme();
        this.loadFavorites();
        this.loadTransition();

        if (this.householdLocations.length > 0) {
          this.selectedLocation = this.householdLocations[0].id;
        }

        // Set up modal watchers
        this.$watch('selectedAnimal', () => this.synchronizeModalState());
        this.$watch('selectedProduct', () => this.synchronizeModalState());
        this.$watch('selectedRecipe', () => this.synchronizeModalState());
        this.$watch('selectedIngredient', () => this.synchronizeModalState());
        this.$watch('openChecker', () => this.synchronizeModalState());

        // Validate normalized data
        const normalizedData = {
          animals: this.animals,
          animalUses: this.animalUses,
          products: this.products,
          recipes: this.recipes,
          ingredients: this.ingredients,
          alternatives: this.alternatives,
          everydayItems: this.everydayItems,
          householdLocations: this.householdLocations,
          nutrients: this.nutrients,
          learnArticles: this.learnArticles,
          resources: this.resources,
          sources: this.sources,
          transitionPaths: this.transitionPaths,
          transitionTasksByPath: this.transitionTasksByPath
        };
        if (typeof validateGoVeganData === 'function') {
          const report = validateGoVeganData(normalizedData);
          console.group('🔍 Go Vegan Data Validation');
          console.log('📊 Summary:', report.summary);
          if (report.errors && report.errors.length > 0) {
            console.warn('⚠️ Errors:');
            report.errors.forEach(e => console.warn('  -', e));
          } else {
            console.log('✅ No errors found.');
          }
          if (report.warnings && report.warnings.length > 0) {
            console.warn('⚠️ Warnings:');
            report.warnings.forEach(w => console.warn('  -', w));
          }
          console.groupEnd();
        }
      },

      normalizeData() {
        const fixIngredientId = (id) => {
          if (id === 'ingredient-ovalbumin') {
            const existing = this.ingredients.find(i => i.id === 'ingredient-albumen');
            return existing ? 'ingredient-albumen' : null;
          }
          if (id === 'ingredient-omega3-fish') {
            return null;
          }
          return id;
        };

        // Normalize animals
        this.animals.forEach(animal => {
          if (animal.ingredientIds) {
            animal.ingredientIds = animal.ingredientIds
              .map(id => fixIngredientId(id))
              .filter(Boolean);
          }
          if (!animal.categories) animal.categories = [];
          if (!animal.sourceIds) animal.sourceIds = [];
          if (!animal.useIds) animal.useIds = [];
          if (!animal.alternativeIds) animal.alternativeIds = [];
          // Set needsResearch: true if no specific sources, but preserve imported value if set
          if (animal.needsResearch === undefined) {
            animal.needsResearch = true;
          }
        });

        // Normalize ingredients
        this.ingredients.forEach(ing => {
          if (ing.animalIds) {
            ing.animalIds = ing.animalIds
              .map(id => this.animals.some(a => a.id === id) ? id : null)
              .filter(Boolean);
          }
          if (!ing.sourceIds) ing.sourceIds = [];
          if (!ing.alternativeIds) ing.alternativeIds = [];
          if (ing.needsResearch === undefined) {
            ing.needsResearch = true;
          }
        });

        // Normalize uses
        this.animalUses.forEach(use => {
          if (use.animalIds) {
            use.animalIds = use.animalIds
              .map(id => this.animals.some(a => a.id === id) ? id : null)
              .filter(Boolean);
          }
          if (!use.sourceIds) use.sourceIds = [];
          if (use.needsResearch === undefined) {
            use.needsResearch = true;
          }
        });

        // Normalize products: remove unsupported claims and set needsResearch
        this.products.forEach(p => {
          if (!p.productStatus) p.productStatus = 'verify-current-packaging';
          // Downgrade any certified/labeled claims without direct source
          if ((p.productStatus === 'certified-vegan' || p.productStatus === 'manufacturer-labeled-vegan') &&
              (!p.sourceIds || p.sourceIds.length === 0)) {
            p.productStatus = 'verify-current-packaging';
          }
          if (!p.sourceIds) p.sourceIds = [];
          if (!p.dietaryTags) p.dietaryTags = [];
          // Unsupported company scope
          if (p.companyScope === 'all-vegan' && (!p.sourceIds || p.sourceIds.length === 0)) {
            p.companyScope = 'unknown';
          }
          if (p.needsResearch === undefined) {
            p.needsResearch = true;
          }
        });

        // Normalize everyday items
        this.everydayItems.forEach(item => {
          if (item.animalIds) {
            item.animalIds = item.animalIds.filter(id => this.animals.some(a => a.id === id));
          }
          if (item.ingredientIds) {
            item.ingredientIds = item.ingredientIds.filter(id => this.ingredients.some(i => i.id === id));
          }
          if (item.alternativeIds) {
            item.alternativeIds = item.alternativeIds.filter(id => this.alternatives.some(a => a.id === id));
          }
          if (item.locationIds) {
            item.locationIds = item.locationIds.filter(id => this.householdLocations.some(l => l.id === id));
          }
          if (!item.sourceIds) item.sourceIds = [];
          if (item.needsResearch === undefined) {
            item.needsResearch = true;
          }
        });

        // Normalize alternatives
        this.alternatives.forEach(alt => {
          if (alt.animalIds) {
            alt.animalIds = alt.animalIds.filter(id => this.animals.some(a => a.id === id));
          }
          if (alt.useIds) {
            alt.useIds = alt.useIds.filter(id => this.animalUses.some(u => u.id === id));
          }
          if (!alt.sourceIds) alt.sourceIds = [];
          if (alt.needsResearch === undefined) {
            alt.needsResearch = true;
          }
        });

        // Normalize nutrients
        this.nutrients.forEach(n => {
          if (!n.sourceIds) n.sourceIds = [];
          if (n.needsResearch === undefined) {
            n.needsResearch = true;
          }
        });

        // Normalize learn articles: mark needsResearch true if no direct sources
        this.learnArticles.forEach(article => {
          if (article.needsResearch === undefined) {
            article.needsResearch = true;
          }
        });
      }
    };
  });
});

// ============================================================
// DATA VALIDATOR
// ============================================================
function validateGoVeganData(data) {
  const report = {
    summary: {},
    errors: [],
    warnings: []
  };

  if (!data) return report;

  const collections = ['animals', 'animalUses', 'products', 'recipes', 'ingredients', 'alternatives', 'everydayItems', 'householdLocations', 'nutrients', 'learnArticles', 'resources', 'sources'];
  const allIds = [];
  const validStatuses = ['animal-derived', 'usually-animal-derived', 'may-be-animal-derived', 'usually-plant-or-microbial', 'vegan', 'unknown'];
  const validProductStatuses = ['certified-vegan', 'manufacturer-labeled-vegan', 'homemade-vegan', 'appears-vegan-check-label', 'verify-current-packaging', 'unknown'];
  const validCategories = ['Farmed', 'Aquatic', 'Insects', 'Materials', 'Research', 'Entertainment', 'Labor', 'Companionship'];

  collections.forEach(name => {
    const items = data[name] || [];
    report.summary[name] = items.length;
    const idSet = new Set();
    items.forEach(item => {
      if (!item.id) {
        report.errors.push(`Missing ID in ${name}`);
        return;
      }
      if (idSet.has(item.id)) {
        report.errors.push(`Duplicate ID within ${name}: ${item.id}`);
      }
      idSet.add(item.id);
      if (allIds.includes(item.id)) {
        report.errors.push(`Duplicate ID across collections: ${item.id}`);
      }
      allIds.push(item.id);

      const relationFields = ['useIds', 'ingredientIds', 'productIds', 'recipeIds', 'alternativeIds', 'sourceIds', 'locationIds', 'relatedProductIds', 'relatedRecipeIds', 'derivedIngredientIds', 'articleIds', 'animalIds'];
      relationFields.forEach(field => {
        if (item[field] && Array.isArray(item[field])) {
          let targetCol = null;
          if (field === 'useIds') targetCol = 'animalUses';
          else if (field === 'ingredientIds' || field === 'derivedIngredientIds') targetCol = 'ingredients';
          else if (field === 'productIds' || field === 'relatedProductIds') targetCol = 'products';
          else if (field === 'recipeIds' || field === 'relatedRecipeIds') targetCol = 'recipes';
          else if (field === 'alternativeIds') targetCol = 'alternatives';
          else if (field === 'sourceIds') targetCol = 'sources';
          else if (field === 'locationIds') targetCol = 'householdLocations';
          else if (field === 'articleIds') targetCol = 'learnArticles';
          else if (field === 'animalIds') targetCol = 'animals';

          if (targetCol) {
            const targetItems = data[targetCol] || [];
            item[field].forEach(id => {
              if (!targetItems.some(t => t.id === id)) {
                report.warnings.push(`Missing ${targetCol} reference: ${id} in ${name}.${field}`);
              }
            });
          }
        }
      });

      if (name === 'ingredients' && item.status && !validStatuses.includes(item.status)) {
        report.errors.push(`Invalid ingredient status: ${item.status} in ${item.id}`);
      }
      if (name === 'ingredients' && !item.status) {
        report.warnings.push(`Missing ingredient status: ${item.id}`);
      }

      if (name === 'products' && item.productStatus && !validProductStatuses.includes(item.productStatus)) {
        report.errors.push(`Invalid product status: ${item.productStatus} in ${item.id}`);
      }
      if (name === 'products' && !item.productStatus) {
        report.warnings.push(`Missing product status: ${item.id}`);
      }

      if (name === 'animals' && item.categories) {
        item.categories.forEach(cat => {
          if (!validCategories.includes(cat)) {
            report.warnings.push(`Invalid category: ${cat} in ${item.id}`);
          }
        });
      }

      if (name === 'recipes') {
        if (!item.ingredients || item.ingredients.length === 0) {
          report.errors.push(`Recipe missing ingredients: ${item.id}`);
        }
        if (!item.instructions || item.instructions.length === 0) {
          report.errors.push(`Recipe missing instructions: ${item.id}`);
        }
      }

      if (name === 'everydayItems') {
        if (!item.name) {
          report.errors.push(`Everyday item missing name: ${item.id}`);
        }
        if (!item.locationIds || item.locationIds.length === 0) {
          report.warnings.push(`Everyday item missing locationIds: ${item.id}`);
        }
      }

      if (name === 'sources' && item.url) {
        try {
          const url = new URL(item.url);
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            report.warnings.push(`Non-HTTP(S) URL: ${item.url} in ${item.id}`);
          }
        } catch (e) {
          report.warnings.push(`Malformed URL: ${item.url} in ${item.id}`);
        }
      }

      if (name === 'products' && item.dietaryTags) {
        const base = (item.base || '').toLowerCase();
        if (item.dietaryTags.includes('soy-free') && base.includes('soy')) {
          report.errors.push(`Soy-free conflict: ${item.id} has soy in base: "${item.base}"`);
        }
        if (item.dietaryTags.includes('peanut-free') && base.includes('peanut')) {
          report.errors.push(`Peanut-free conflict: ${item.id} has peanut in base: "${item.base}"`);
        }
        if (item.dietaryTags.includes('tree-nut-free') && (base.includes('almond') || base.includes('cashew') || base.includes('walnut') || base.includes('pecan') || base.includes('hazelnut') || base.includes('pistachio'))) {
          report.errors.push(`Tree-nut-free conflict: ${item.id} has nuts in base: "${item.base}"`);
        }
      }

      if (name === 'products' && !item.dietaryTagBasis) {
        report.warnings.push('Product missing dietary-tag audit: ' + item.id);
      }

      if (name === 'products' && item.productStatus === 'certified-vegan' && (!item.sourceIds || item.sourceIds.length === 0)) {
        report.warnings.push(`Product marked certified-vegan without sources: ${item.id}`);
      }
      if (name === 'products' && item.productStatus === 'manufacturer-labeled-vegan' && (!item.sourceIds || item.sourceIds.length === 0)) {
        report.warnings.push(`Product marked manufacturer-labeled-vegan without sources: ${item.id}`);
      }
      if (name === 'animals' && (!item.sourceIds || item.sourceIds.length === 0)) {
        report.warnings.push(`Animal missing sources: ${item.id}`);
      }
    });
  });

  // Validate transition data
  if (data.transitionPaths) {
    const paths = data.transitionPaths;
    const tasks = data.transitionTasksByPath || {};
    report.summary.transitionPaths = paths.length;
    paths.forEach(p => {
      if (!p.id || !p.label) {
        report.errors.push(`Invalid transition path: ${JSON.stringify(p)}`);
      }
      if (p.id && !tasks[p.id]) {
        report.warnings.push(`Transition path "${p.id}" has no tasks`);
      }
      if (p.id && tasks[p.id] && (!Array.isArray(tasks[p.id]) || tasks[p.id].some(t => typeof t !== 'string' || t.trim() === ''))) {
        report.errors.push(`Invalid tasks for path "${p.id}"`);
      }
    });
    // Check for extra task keys
    Object.keys(tasks).forEach(key => {
      if (!paths.some(p => p.id === key)) {
        report.warnings.push(`TransitionTasksByPath has extra key "${key}" without matching path`);
      }
    });
  }

  return report;
}

// ============================================================
// APPLICATION DATA
// ============================================================
(function() {
  'use strict';

  // ---- Sources ----
  const sources = [];
  function addSource(s) {
    sources.push({
      id: s.id || 'src-' + s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: s.title || '',
      organization: s.organization || '',
      url: s.url || '',
      publicationDate: s.publicationDate || '',
      accessedDate: s.accessedDate || '',
      sourceType: s.sourceType || 'nonprofit',
      supports: s.supports || []
    });
  }

  addSource({
    id: 'source-vegan-society',
    title: 'The Vegan Society',
    organization: 'The Vegan Society',
    url: 'https://www.vegansociety.com',
    sourceType: 'nonprofit'
  });
  addSource({
    id: 'source-nih-ods',
    title: 'NIH Office of Dietary Supplements',
    organization: 'National Institutes of Health',
    url: 'https://ods.od.nih.gov',
    sourceType: 'government'
  });
  addSource({
    id: 'source-fda',
    title: 'FDA Food Allergen Guidance',
    organization: 'FDA',
    url: 'https://www.fda.gov/food/food-allergens',
    sourceType: 'government'
  });
  addSource({
    id: 'source-leaping-bunny',
    title: 'Leaping Bunny Program',
    organization: 'Cruelty Free International',
    url: 'https://www.leapingbunny.org',
    sourceType: 'certification'
  });
  addSource({
    id: 'src-efsa-dairy-cows-2023',
    title: 'Welfare of dairy cows',
    organization: 'European Food Safety Authority',
    url: 'https://www.efsa.europa.eu/en/efsajournal/pub/7993',
    publicationDate: '2023',
    accessedDate: '2026-08-19',
    sourceType: 'government',
    supports: ['animal-cattle']
  });
  addSource({
    id: 'src-efsa-pigs-2022',
    title: 'Welfare of pigs on farm',
    organization: 'European Food Safety Authority',
    url: 'https://www.efsa.europa.eu/en/efsajournal/pub/7421',
    publicationDate: '2022',
    accessedDate: '2026-08-19',
    sourceType: 'government',
    supports: ['animal-pig']
  });
  addSource({
    id: 'src-efsa-laying-hens-2023',
    title: 'Welfare of laying hens on farm',
    organization: 'European Food Safety Authority',
    url: 'https://www.efsa.europa.eu/en/efsajournal/pub/7789',
    publicationDate: '2023',
    accessedDate: '2026-08-19',
    sourceType: 'government',
    supports: ['animal-chicken']
  });
  addSource({
    id: 'src-efsa-broilers-2023',
    title: 'Welfare of broilers on farm',
    organization: 'European Food Safety Authority',
    url: 'https://www.efsa.europa.eu/en/efsajournal/pub/7788',
    publicationDate: '2023',
    accessedDate: '2026-08-19',
    sourceType: 'government',
    supports: ['animal-chicken']
  });
  addSource({
    id: 'src-efsa-fish-welfare-2009',
    title: 'General approach to fish welfare and the concept of sentience in fish',
    organization: 'European Food Safety Authority',
    url: 'https://www.efsa.europa.eu/en/efsajournal/pub/954',
    publicationDate: '2009-02-24',
    accessedDate: '2026-08-19',
    sourceType: 'government',
    supports: ['animal-fish']
  });
  addSource({
    id: 'src-usda-honey-bee-health',
    title: 'ARS Honey Bee Health',
    organization: 'USDA Agricultural Research Service',
    url: 'https://www.ars.usda.gov/oc/br/ccd/index/',
    publicationDate: '',
    accessedDate: '2026-08-19',
    sourceType: 'government',
    supports: ['animal-bees']
  });
  addSource({
    id: 'src-usda-honey-bee-communication',
    title: 'Bigger is better: honey bee colonies as distributed information-gathering systems',
    organization: 'USDA Agricultural Research Service',
    url: 'https://www.ars.usda.gov/research/publications/publication/?seqNo115=285285',
    publicationDate: '2013-03-03',
    accessedDate: '2026-08-19',
    sourceType: 'academic',
    supports: ['animal-bees']
  });


  // ---- Researched animal/use sources (authoritative public bodies) ----
  addSource({ id: 'src-fao-animal-products-definitions', title: 'Agricultural production data structure, concepts and definitions', organization: 'Food and Agriculture Organization of the United Nations', url: 'https://openknowledge.fao.org/server/api/core/bitstreams/8f3f2ac4-88ea-47d0-8923-11a5eafc5d9d/content', accessedDate: '2026-08-19', sourceType: 'intergovernmental', supports: ['use-meat', 'use-dairy', 'use-eggs', 'use-beekeeping', 'use-leather', 'use-wool', 'use-feathers-down'] });
  addSource({ id: 'src-efsa-small-ruminants-transport-2022', title: 'Welfare of small ruminants during transport', organization: 'European Food Safety Authority', url: 'https://www.efsa.europa.eu/en/efsajournal/pub/7404', publicationDate: '2022-09-07', accessedDate: '2026-08-19', sourceType: 'government', supports: ['animal-sheep', 'animal-goat'] });
  addSource({ id: 'src-efsa-rabbits-2020', title: 'Health and welfare of rabbits farmed in different production systems', organization: 'European Food Safety Authority', url: 'https://www.efsa.europa.eu/en/efsajournal/pub/5944', publicationDate: '2020', accessedDate: '2026-08-19', sourceType: 'government', supports: ['animal-rabbit'] });
  addSource({ id: 'src-efsa-birds-rabbits-transport-2022', title: 'Welfare of domestic birds and rabbits transported in containers', organization: 'European Food Safety Authority', url: 'https://www.efsa.europa.eu/en/efsajournal/pub/7441', publicationDate: '2022-09-07', accessedDate: '2026-08-19', sourceType: 'government', supports: ['animal-chicken', 'animal-turkey', 'animal-duck-goose', 'animal-rabbit'] });
  addSource({ id: 'src-fao-silkworm-cocoons', title: 'International Standard Industrial Classification activities covered by agricultural censuses', organization: 'Food and Agriculture Organization of the United Nations', url: 'https://www.fao.org/4/a0135e/A0135E10.htm', accessedDate: '2026-08-19', sourceType: 'intergovernmental', supports: ['animal-silkworm', 'use-silk', 'use-fur'] });
  addSource({ id: 'src-fda-carmine-labeling', title: 'Declaration by Name of Cochineal Extract and Carmine', organization: 'U.S. Food and Drug Administration', url: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/small-entity-compliance-guide-declaration-name-label-all-foods-and-cosmetic-products-contain', publicationDate: '2018-11-30', accessedDate: '2026-08-19', sourceType: 'government', supports: ['animal-cochineal', 'use-carmine'] });
  addSource({ id: 'src-usda-animal-welfare-act', title: 'Animal Welfare Act', organization: 'USDA National Agricultural Library', url: 'https://www.nal.usda.gov/animal-health-and-welfare/animal-welfare-act', accessedDate: '2026-08-19', sourceType: 'government', supports: ['use-research-testing', 'use-entertainment'] });
  addSource({ id: 'src-usda-three-rs', title: 'Animal Use Alternatives (3Rs)', organization: 'USDA National Agricultural Library', url: 'https://www.nal.usda.gov/animal-health-and-welfare/animal-use-alternatives', accessedDate: '2026-08-19', sourceType: 'government', supports: ['use-research-testing', 'alt-non-animal-research'] });
  addSource({ id: 'src-fda-color-additives', title: 'Color Additives', organization: 'U.S. Food and Drug Administration', url: 'https://www.fda.gov/industry/color-additives', accessedDate: '2026-08-19', sourceType: 'government', supports: ['ingredient-carmine'] });
  addSource({ id: 'src-nih-ods-vitamind', title: 'Vitamin D Fact Sheet for Health Professionals', organization: 'NIH Office of Dietary Supplements', url: 'https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/', accessedDate: '2026-08-19', sourceType: 'government', supports: ['ingredient-vitamin-d3'] });



  addSource({ id:'src-efsa-fur-animals-2025', title:'Welfare of American mink, red and Arctic foxes, raccoon dog and chinchilla kept for fur production', organization:'European Food Safety Authority', url:'https://www.efsa.europa.eu/en/plain-language-summary/welfare-american-mink-red-and-arctic-foxes-raccoon-dog-and-chinchilla-kept', publicationDate:'2025-07-30', accessedDate:'2026-08-19', sourceType:'government', supports:['animal-mink','animal-fox','animal-raccoon-dog','animal-chinchilla','use-fur'] });
  addSource({ id:'src-usda-awa-quick-reference', title:'Animal Welfare Act Quick Reference Guides', organization:'USDA National Agricultural Library', url:'https://www.nal.usda.gov/animal-health-and-welfare/animal-welfare-act-quick-reference-guides', accessedDate:'2026-08-19', sourceType:'government', supports:['animal-dog','animal-cat','animal-nonhuman-primate','animal-research-rodents','use-companionship','use-breeding-pet-trade','use-research-testing','use-entertainment'] });
  addSource({ id:'src-fao-draft-animals-nigeria', title:'A note on the draft animals used in northern Nigeria', organization:'Food and Agriculture Organization of the United Nations', url:'https://www.fao.org/4/x5455b/x5455b1t.htm', accessedDate:'2026-08-19', sourceType:'intergovernmental', supports:['animal-horse-donkey','use-work-transport'] });


  addSource({ id:'src-idnr-furbearers', title:'Furbearer Hunting and Trapping', organization:'Illinois Department of Natural Resources', url:'https://dnr.illinois.gov/hunting/furbearers.html', accessedDate:'2026-08-19', sourceType:'government', supports:['animal-coyote','use-wildlife-hunting-trapping'] });
  addSource({ id:'src-usda-coyote-fladry', title:'Improving Fladry for Use with Coyotes', organization:'USDA Animal and Plant Health Inspection Service', url:'https://www.aphis.usda.gov/news/stories/improving-fladry-use-coyotes', accessedDate:'2026-08-19', sourceType:'government', supports:['animal-coyote','use-wildlife-conflict-control','alt-nonlethal-wildlife-management'] });

  addSource({ id:'src-ftc-apparel-labeling', title:'Apparel and Labeling: Textile, Wool, Fur, Apparel and Leather Matters', organization:'U.S. Federal Trade Commission', url:'https://www.ftc.gov/news-events/topics/tools-consumers/apparel-labeling', accessedDate:'2026-08-19', sourceType:'government', supports:['item-leather-shoes','item-leather-belt','item-leather-wallet','item-leather-bag','item-wool-sweater','item-cashmere-scarf','item-fur-trim'] });
  addSource({ id:'src-fda-cosmetics-labeling', title:'Cosmetics Labeling', organization:'U.S. Food and Drug Administration', url:'https://www.fda.gov/cosmetics/cosmetics-labeling', accessedDate:'2026-08-19', sourceType:'government', supports:['item-lipstick','item-blush','item-eye-shadow','item-mascara','item-lotion','item-shampoo','item-conditioner'] });
  addSource({ id:'src-fda-cruelty-free-claims', title:'Cruelty Free and Not Tested on Animals', organization:'U.S. Food and Drug Administration', url:'https://www.fda.gov/cosmetics/cosmetics-labeling-claims/cruelty-freenot-tested-animals', accessedDate:'2026-08-19', sourceType:'government', supports:['item-cosmetics-general','item-shampoo','item-conditioner','item-lotion'] });

  addSource({ id:'src-fda-types-food-ingredients', title:'Types of Food Ingredients', organization:'U.S. Food and Drug Administration', url:'https://www.fda.gov/food/food-additives-and-gras-ingredients-information-consumers/types-food-ingredients', accessedDate:'2026-08-19', sourceType:'government', supports:['ingredient-natural-flavors','ingredient-enzymes','ingredient-rennet','ingredient-chymosin','ingredient-mono-diglycerides','ingredient-l-cysteine'] });
  addSource({ id:'src-fda-food-enzyme-preparations', title:'Enzyme Preparations Used in Food', organization:'U.S. Food and Drug Administration', url:'https://www.fda.gov/food/generally-recognized-safe-gras/enzyme-preparations-used-food-partial-list', accessedDate:'2026-08-19', sourceType:'government', supports:['ingredient-rennet','ingredient-chymosin','ingredient-lipase','ingredient-papain'] });
  addSource({ id:'src-fda-microbial-food-ingredients', title:'Microorganisms and Microbial-Derived Ingredients Used in Food', organization:'U.S. Food and Drug Administration', url:'https://www.fda.gov/food/generally-recognized-safe-gras/microorganisms-microbial-derived-ingredients-used-food-partial-list', accessedDate:'2026-08-19', sourceType:'government', supports:['ingredient-chymosin','ingredient-lipase','ingredient-enzymes','ingredient-lactic-acid'] });
  addSource({ id:'src-fda-supplement-ingredient-labeling', title:'Dietary Supplement Labeling Guide: Ingredient Labeling', organization:'U.S. Food and Drug Administration', url:'https://www.fda.gov/food/dietary-supplements-guidance-documents-regulatory-information/dietary-supplement-labeling-guide-chapter-v-ingredient-labeling', accessedDate:'2026-08-19', sourceType:'government', supports:['ingredient-gelatin','ingredient-glycerin','ingredient-fish-oil','ingredient-cod-liver-oil'] });
  addSource({ id:'src-usda-gelatin-collagen-byproducts', title:'Animal byproducts for production of gelatin and collagen for human consumption', organization:'USDA Animal and Plant Health Inspection Service', url:'https://www.aphis.usda.gov/animal-product-export/export-animal-products-european-union/european-union-eu-animal-products-human', accessedDate:'2026-08-19', sourceType:'government', supports:['ingredient-gelatin','ingredient-collagen','ingredient-fish-gelatin'] });

  addSource({ id:"src-product-impossible", title:"Impossible Foods product and nutrition information", organization:"Impossible Foods", url:"https://impossiblefoods.com/", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-beyond", title:"Beyond Meat products", organization:"Beyond Meat", url:"https://www.beyondmeat.com/en-US/products/", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-gardein", title:"Gardein products", organization:"Gardein", url:"https://www.gardein.com/", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-dr-praegers", title:"Dr. Praeger’s products", organization:"Dr. Praeger’s", url:"https://www.drpraegers.com/products/", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-boca", title:"Boca product information", organization:"Boca", url:"https://www.bocaburger.com/", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-meati", title:"Meati products", organization:"Meati", url:"https://www.meati.com/products/", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-morningstar", title:"MorningStar Farms products", organization:"MorningStar Farms", url:"https://www.morningstarfarms.com/en_US/products.html", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-daring", title:"Daring plant chicken", organization:"Daring", url:"https://daring.com/", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-abbots", title:"Abbot’s plant-based proteins", organization:"Abbot’s", url:"https://abbots.com/", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-tofurky", title:"Tofurky products", organization:"Tofurky", url:"https://tofurky.com/what-we-make/", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-field-roast", title:"Field Roast products", organization:"Field Roast", url:"https://fieldroast.com/products/", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-lightlife", title:"Lightlife foods", organization:"Lightlife", url:"https://lightlife.com/our-food/", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-good-catch", title:"Good Catch products", organization:"Good Catch", url:"https://goodcatchfoods.com/our-products/", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-silk", title:"Silk plant-based products", organization:"Silk", url:"https://silk.com/plant-based-products/", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-oatly", title:"Oatly US products", organization:"Oatly", url:"https://www.oatly.com/en-us/products", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-planet-oat", title:"Planet Oat products", organization:"Planet Oat", url:"https://planetoat.com/products/", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-almond-breeze", title:"Almond Breeze products", organization:"Almond Breeze", url:"https://www.bluediamond.com/brand/almond-breeze/", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-califia", title:"Califia Farms products", organization:"Califia Farms", url:"https://www.califiafarms.com/collections/all-products", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-ripple", title:"Ripple Foods products", organization:"Ripple", url:"https://ripplefoods.com/collections/all", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-so-delicious", title:"So Delicious product certifications and products", organization:"So Delicious", url:"https://sodeliciousdairyfree.com/about-us/faqs", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-good-karma", title:"Good Karma Foods products", organization:"Good Karma", url:"https://goodkarmafoods.com/products/", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-violife", title:"Violife US products", organization:"Violife", url:"https://www.violife.com/en-us/products", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-daiya", title:"Daiya products", organization:"Daiya", url:"https://daiyafoods.com/collections/all", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-fyh", title:"Follow Your Heart products", organization:"Follow Your Heart", url:"https://followyourheart.com/products/", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-kite-hill", title:"Kite Hill products", organization:"Kite Hill", url:"https://www.kite-hill.com/our-foods/", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-tofutti", title:"Tofutti products", organization:"Tofutti", url:"https://tofutti.com/frozen-desserts/", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-earth-balance", title:"Earth Balance products", organization:"Earth Balance", url:"https://www.earthbalancenatural.com/products", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-country-crock", title:"Country Crock plant butter", organization:"Country Crock", url:"https://www.countrycrock.com/en-us/our-products/plant-butter", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-miyokos", title:"Miyoko’s Creamery products", organization:"Miyoko’s Creamery", url:"https://www.miyokos.com/collections/all", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-hellmanns", title:"Hellmann’s vegan dressing and spread", organization:"Hellmann’s", url:"https://www.hellmanns.com/us/en/p/vegan-dressing-spread.html/00048001010554", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-just-egg", title:"JUST Egg products", organization:"JUST Egg", url:"https://www.ju.st/eat/just-egg", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-ben-jerrys", title:"Ben & Jerry’s non-dairy flavors", organization:"Ben & Jerry’s", url:"https://www.benjerry.com/flavors/non-dairy", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-talenti", title:"Talenti products", organization:"Talenti", url:"https://www.talentigelato.com/us/en/products.html", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-amys", title:"Amy’s product catalog", organization:"Amy’s", url:"https://www.amys.com/our-foods", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  addSource({ id:"src-product-blackbird", title:"Blackbird Foods products", organization:"Blackbird Foods", url:"https://www.blackbirdfoods.com/", accessedDate:'2026-08-20', sourceType:'manufacturer', supports:[] });
  // ---- Phase 6: authoritative nutrition and beginner-education sources ----
  addSource({ id:'src-nih-b12', title:'Vitamin B12 — Fact Sheet for Health Professionals', organization:'NIH Office of Dietary Supplements', url:'https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/', accessedDate:'2026-08-20', sourceType:'government', supports:['nutrient-b12','learn-nutrition-basics','learn-b12-plan'] });
  addSource({ id:'src-nih-iron', title:'Iron — Fact Sheet for Health Professionals', organization:'NIH Office of Dietary Supplements', url:'https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/', accessedDate:'2026-08-20', sourceType:'government', supports:['nutrient-iron','learn-iron-calcium'] });
  addSource({ id:'src-nih-calcium', title:'Calcium — Fact Sheet for Health Professionals', organization:'NIH Office of Dietary Supplements', url:'https://ods.od.nih.gov/factsheets/Calcium-HealthProfessional/', accessedDate:'2026-08-20', sourceType:'government', supports:['nutrient-calcium','learn-iron-calcium'] });
  addSource({ id:'src-nih-vitamin-d', title:'Vitamin D — Fact Sheet for Health Professionals', organization:'NIH Office of Dietary Supplements', url:'https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/', accessedDate:'2026-08-20', sourceType:'government', supports:['nutrient-vitamin-d','learn-nutrition-basics'] });
  addSource({ id:'src-nih-iodine', title:'Iodine — Fact Sheet for Health Professionals', organization:'NIH Office of Dietary Supplements', url:'https://ods.od.nih.gov/factsheets/Iodine-HealthProfessional/', accessedDate:'2026-08-20', sourceType:'government', supports:['nutrient-iodine','learn-nutrition-basics'] });
  addSource({ id:'src-nih-omega3', title:'Omega-3 Fatty Acids — Fact Sheet for Health Professionals', organization:'NIH Office of Dietary Supplements', url:'https://ods.od.nih.gov/factsheets/Omega3FattyAcids-HealthProfessional/', accessedDate:'2026-08-20', sourceType:'government', supports:['nutrient-omega3','learn-nutrition-basics'] });
  addSource({ id:'src-nih-zinc', title:'Zinc — Fact Sheet for Health Professionals', organization:'NIH Office of Dietary Supplements', url:'https://ods.od.nih.gov/factsheets/Zinc-HealthProfessional/', accessedDate:'2026-08-20', sourceType:'government', supports:['nutrient-zinc'] });
  addSource({ id:'src-nih-selenium', title:'Selenium — Fact Sheet for Health Professionals', organization:'NIH Office of Dietary Supplements', url:'https://ods.od.nih.gov/factsheets/Selenium-HealthProfessional/', accessedDate:'2026-08-20', sourceType:'government', supports:['nutrient-selenium'] });
  addSource({ id:'src-nih-choline', title:'Choline — Fact Sheet for Health Professionals', organization:'NIH Office of Dietary Supplements', url:'https://ods.od.nih.gov/factsheets/Choline-HealthProfessional/', accessedDate:'2026-08-20', sourceType:'government', supports:['nutrient-choline'] });
  addSource({ id:'src-dga-2020-2025', title:'Dietary Guidelines for Americans, 2020–2025', organization:'U.S. Departments of Agriculture and Health and Human Services', url:'https://www.dietaryguidelines.gov/sites/default/files/2020-12/Dietary_Guidelines_for_Americans_2020-2025.pdf', publicationDate:'2020-12', accessedDate:'2026-08-20', sourceType:'government', supports:['nutrient-protein','learn-balanced-meals','learn-nutrition-basics'] });
  addSource({ id:'src-fda-allergen-labels', title:'Have Food Allergies? Read the Label', organization:'U.S. Food and Drug Administration', url:'https://www.fda.gov/consumers/consumer-updates/have-food-allergies-read-label', accessedDate:'2026-08-20', sourceType:'government', supports:['learn-label-reading','learn-allergies-cross-contact'] });

  // ---- Animals ----
  const animals = [];
  function addAnimal(a) {
    animals.push({ id: a.id, commonName: a.commonName, singularName: a.singularName, scientificGroups: a.scientificGroups || [], emoji: a.emoji || '🐾', image: null, summary: a.summary || '', naturalLife: a.naturalLife || { habitat: '', diet: '', socialLife: '', communication: '', cognition: '', parenting: '', naturalBehaviors: [], potentialLifespan: '', notes: '' }, industries: a.industries || [], categories: a.categories || [], useIds: a.useIds || [], ingredientIds: a.ingredientIds || [], productIds: a.productIds || [], alternativeIds: a.alternativeIds || [], recipeIds: a.recipeIds || [], articleIds: a.articleIds || [], welfareConcerns: a.welfareConcerns || [], sourceIds: a.sourceIds || [], sensitiveContent: a.sensitiveContent || false, needsResearch: a.needsResearch !== undefined ? a.needsResearch : !(a.sourceIds && a.sourceIds.length) });
  }

  addAnimal({ id:'animal-cattle', commonName:'Cattle', singularName:'Cow or steer', scientificGroups:['Bos taurus','Bos indicus'], emoji:'🐄', summary:'Domesticated bovines raised for milk, meat, hides and other by-products.', industries:['Dairy','Beef','Leather'], categories:['Farmed','Materials'], useIds:['use-dairy','use-beef','use-leather','use-gelatin-rendering'], ingredientIds:['ingredient-casein','ingredient-whey','ingredient-lactose','ingredient-gelatin','ingredient-tallow'], alternativeIds:['alt-plant-milk','alt-plant-cheese','alt-legume-meat','alt-nonleather-materials','alt-plant-gelling'], welfareConcerns:['Housing and mobility restrictions','Lameness and disease','Transport and slaughter'], sourceIds:['src-efsa-dairy-cows-2023','src-fao-animal-products-definitions'], sensitiveContent:true });
  addAnimal({ id:'animal-pig', commonName:'Pigs', singularName:'Pig', scientificGroups:['Sus scrofa domesticus'], emoji:'🐷', summary:'Domesticated pigs are raised primarily for meat; their hides, fat and tissues may also enter material or ingredient supply chains.', industries:['Pork','Leather','Rendered ingredients','Research'], categories:['Farmed','Materials','Research'], useIds:['use-pork','use-leather','use-gelatin-rendering','use-research-testing'], ingredientIds:['ingredient-gelatin','ingredient-lard'], alternativeIds:['alt-legume-meat','alt-seitan-tempeh','alt-nonleather-materials','alt-plant-gelling'], welfareConcerns:['Restricted housing','Tail biting and tail docking','Heat stress','Transport and slaughter'], sourceIds:['src-efsa-pigs-2022','src-fao-animal-products-definitions'], sensitiveContent:true });
  addAnimal({ id:'animal-chicken', commonName:'Chickens', singularName:'Chicken', scientificGroups:['Gallus gallus domesticus'], emoji:'🐔', summary:'Domesticated birds raised primarily for meat and eggs; feathers are also used in some products.', industries:['Eggs','Poultry meat','Feathers'], categories:['Farmed','Materials'], useIds:['use-eggs','use-poultry','use-feathers-down'], ingredientIds:['ingredient-albumen'], alternativeIds:['alt-egg-cooking','alt-egg-baking','alt-seitan-tempeh','alt-synthetic-insulation'], welfareConcerns:['High stocking density','Bone and mobility problems','Beak treatment','Transport and slaughter'], sourceIds:['src-efsa-laying-hens-2023','src-efsa-broilers-2023','src-efsa-birds-rabbits-transport-2022'], sensitiveContent:true });
  addAnimal({ id:'animal-turkey', commonName:'Turkeys', singularName:'Turkey', scientificGroups:['Meleagris gallopavo domesticus'], emoji:'🦃', summary:'Domesticated poultry raised mainly for meat; feathers may also be collected as by-products.', industries:['Poultry meat','Feathers'], categories:['Farmed','Materials'], useIds:['use-poultry','use-feathers-down'], alternativeIds:['alt-seitan-tempeh','alt-synthetic-insulation'], welfareConcerns:['Stocking density','Mobility and leg problems','Transport and slaughter'], sourceIds:['src-efsa-birds-rabbits-transport-2022'], sensitiveContent:true });
  addAnimal({ id:'animal-duck-goose', commonName:'Ducks and geese', singularName:'Duck or goose', scientificGroups:['Anas platyrhynchos domesticus','Anser anser domesticus'], emoji:'🦆', summary:'Domesticated waterfowl used for meat, eggs, feathers and down.', industries:['Poultry meat','Eggs','Down and feathers'], categories:['Farmed','Materials'], useIds:['use-poultry','use-eggs','use-feathers-down'], alternativeIds:['alt-seitan-tempeh','alt-egg-cooking','alt-synthetic-insulation'], welfareConcerns:['Handling and transport','Access to water for water-related behaviors','Feather collection practices'], sourceIds:['src-efsa-birds-rabbits-transport-2022','src-fao-animal-products-definitions'], sensitiveContent:true });
  addAnimal({ id:'animal-sheep', commonName:'Sheep', singularName:'Sheep', scientificGroups:['Ovis aries'], emoji:'🐑', summary:'Domesticated ruminants raised for meat, milk, wool and skins.', industries:['Lamb and mutton','Dairy','Wool','Leather'], categories:['Farmed','Materials'], useIds:['use-small-ruminant-meat','use-dairy','use-wool','use-leather'], alternativeIds:['alt-legume-meat','alt-plant-milk','alt-nonwool-fibers','alt-nonleather-materials'], welfareConcerns:['Heat and cold exposure','Shearing injuries','Transport and slaughter'], sourceIds:['src-efsa-small-ruminants-transport-2022','src-fao-animal-products-definitions'], sensitiveContent:true });
  addAnimal({ id:'animal-goat', commonName:'Goats', singularName:'Goat', scientificGroups:['Capra hircus'], emoji:'🐐', summary:'Domesticated ruminants raised for meat, milk, hair fibers and skins.', industries:['Goat meat','Dairy','Cashmere and mohair','Leather'], categories:['Farmed','Materials'], useIds:['use-small-ruminant-meat','use-dairy','use-wool','use-leather'], alternativeIds:['alt-legume-meat','alt-plant-milk','alt-nonwool-fibers','alt-nonleather-materials'], welfareConcerns:['Transport stress','Housing and thermal conditions','Slaughter'], sourceIds:['src-efsa-small-ruminants-transport-2022','src-fao-animal-products-definitions'], sensitiveContent:true });
  addAnimal({ id:'animal-rabbit', commonName:'Rabbits', singularName:'Rabbit', scientificGroups:['Oryctolagus cuniculus domesticus'], emoji:'🐇', summary:'Domesticated rabbits are used for meat, fur, companionship and research.', industries:['Meat','Fur','Research','Companionship'], categories:['Farmed','Materials','Research','Companionship'], useIds:['use-rabbit-meat','use-fur','use-research-testing','use-companionship'], alternativeIds:['alt-legume-meat','alt-nonfur-materials','alt-non-animal-research'], welfareConcerns:['Restricted housing','Social isolation','Transport and handling'], sourceIds:['src-efsa-rabbits-2020','src-efsa-birds-rabbits-transport-2022','src-usda-animal-welfare-act'], sensitiveContent:true });
  addAnimal({ id:'animal-fish', commonName:'Finfish', singularName:'Fish', scientificGroups:['Actinopterygii and other finfish groups'], emoji:'🐟', summary:'A broad category of aquatic vertebrates caught in fisheries or raised in aquaculture for food, oil, meal and other uses; biology varies greatly by species.', industries:['Capture fisheries','Aquaculture','Fish oil','Fishmeal','Research'], categories:['Aquatic','Farmed','Research'], useIds:['use-fishing-aquaculture','use-research-testing'], ingredientIds:['ingredient-isinglass'], alternativeIds:['alt-plant-seafood','alt-algae-omega3'], welfareConcerns:['Capture stress','Bycatch','Water quality and stocking conditions','Slaughter methods'], sourceIds:['src-efsa-fish-welfare-2009'], sensitiveContent:true });
  addAnimal({ id:'animal-shellfish', commonName:'Crustaceans and mollusks', singularName:'Shellfish', scientificGroups:['Crustacea','Mollusca'], emoji:'🦐', summary:'A consumer category covering aquatic invertebrates such as shrimp, crabs, lobsters, oysters, mussels and squid.', industries:['Capture fisheries','Aquaculture','Food'], categories:['Aquatic','Farmed'], useIds:['use-fishing-aquaculture'], alternativeIds:['alt-plant-seafood'], welfareConcerns:['Capture and handling','Bycatch and habitat impacts','Holding and killing practices'], sourceIds:['src-fao-animal-products-definitions'], needsResearch:true, sensitiveContent:true });
  addAnimal({ id:'animal-bees', commonName:'Honey bees', singularName:'Honey bee', scientificGroups:['Apis mellifera'], emoji:'🐝', summary:'Managed honey-bee colonies are used for crop pollination and for honey, beeswax, propolis and royal jelly.', industries:['Pollination','Honey','Beeswax'], categories:['Insects','Farmed'], useIds:['use-beekeeping'], ingredientIds:['ingredient-honey','ingredient-beeswax','ingredient-propolis','ingredient-royal-jelly'], alternativeIds:['alt-liquid-sweeteners','alt-plant-waxes'], welfareConcerns:['Transport of colonies','Pesticide exposure','Disease and parasite management','Hive manipulation'], sourceIds:['src-usda-honey-bee-health','src-usda-honey-bee-communication','src-fao-animal-products-definitions'] });
  addAnimal({ id:'animal-silkworm', commonName:'Silkworms', singularName:'Silkworm', scientificGroups:['Bombyx mori'], emoji:'🐛', summary:'Domesticated moth larvae reared to produce cocoons whose fibers are processed into silk.', industries:['Silk'], categories:['Insects','Materials','Farmed'], useIds:['use-silk'], alternativeIds:['alt-nonsilk-fibers'], welfareConcerns:['Cocoon processing commonly occurs before adult emergence'], sourceIds:['src-fao-silkworm-cocoons'], sensitiveContent:true });
  addAnimal({ id:'animal-cochineal', commonName:'Cochineal insects', singularName:'Cochineal insect', scientificGroups:['Dactylopius coccus'], emoji:'🪲', summary:'Scale insects used to produce cochineal extract and carmine color additives, which must be named on U.S. food and cosmetic labels when present.', industries:['Food color','Cosmetics color','Drug color'], categories:['Insects','Materials'], useIds:['use-carmine'], alternativeIds:['alt-noninsect-red-colors'], welfareConcerns:['Insects are collected and processed to obtain the colorant'], sourceIds:['src-fda-carmine-labeling'], sensitiveContent:true });
  addAnimal({ id:'animal-laboratory', commonName:'Animals used in research', singularName:'Research animal', scientificGroups:['Multiple mammal, bird, fish and invertebrate species'], emoji:'🧫', summary:'A cross-species grouping for animals used in research, testing and teaching; U.S. coverage and reporting requirements vary by species and activity.', industries:['Research','Testing','Teaching'], categories:['Research'], useIds:['use-research-testing'], alternativeIds:['alt-non-animal-research'], welfareConcerns:['Pain or distress','Housing and social needs','Procedure-related harms'], sourceIds:['src-usda-animal-welfare-act','src-usda-three-rs'], sensitiveContent:true });




  addAnimal({ id:'animal-dog', commonName:'Dogs', singularName:'Dog', scientificGroups:['Canis lupus familiaris'], emoji:'🐕', summary:'Domesticated dogs are kept as companions and also used in breeding, research, security, hunting, assistance, work and exhibition. The applicable U.S. Animal Welfare Act definition expressly includes dogs used for hunting, security or breeding.', industries:['Companionship','Breeding and sale','Research','Security and assistance','Exhibition'], categories:['Companionship','Research','Labor','Entertainment'], useIds:['use-companionship','use-breeding-pet-trade','use-research-testing','use-work-transport','use-entertainment'], alternativeIds:['alt-adoption-rescue','alt-non-animal-research','alt-animal-free-entertainment'], welfareConcerns:['Commercial breeding conditions','Transport','Housing and social needs','Procedure-related harms in research'], sourceIds:['src-usda-animal-welfare-act','src-usda-awa-quick-reference'], sensitiveContent:true });
  addAnimal({ id:'animal-cat', commonName:'Cats', singularName:'Cat', scientificGroups:['Felis catus'], emoji:'🐈', summary:'Domesticated cats are primarily kept as companions but may also be involved in breeding, commercial sale, exhibition and research.', industries:['Companionship','Breeding and sale','Research','Exhibition'], categories:['Companionship','Research','Entertainment'], useIds:['use-companionship','use-breeding-pet-trade','use-research-testing','use-entertainment'], alternativeIds:['alt-adoption-rescue','alt-non-animal-research','alt-animal-free-entertainment'], welfareConcerns:['Commercial breeding conditions','Transport','Housing and behavioral needs','Procedure-related harms in research'], sourceIds:['src-usda-animal-welfare-act','src-usda-awa-quick-reference'], sensitiveContent:true });
  addAnimal({ id:'animal-mink', commonName:'American mink', singularName:'Mink', scientificGroups:['Neogale vison'], emoji:'🦦', summary:'American mink are semiaquatic mustelids farmed for fur. EFSA identifies restricted movement, limited exploration and lack of open water among concerns associated with current cage systems.', industries:['Fur'], categories:['Farmed','Materials'], useIds:['use-fur'], alternativeIds:['alt-nonfur-materials'], welfareConcerns:['Restricted movement and exploration','Barren cages','Lack of open water','Injuries from fighting in some group housing'], sourceIds:['src-efsa-fur-animals-2025'], sensitiveContent:true });
  addAnimal({ id:'animal-fox', commonName:'Red and Arctic foxes', singularName:'Fox', scientificGroups:['Vulpes vulpes','Vulpes lagopus'], emoji:'🦊', summary:'Red and Arctic foxes are among the species farmed for fur assessed by EFSA.', industries:['Fur'], categories:['Farmed','Materials'], useIds:['use-fur'], alternativeIds:['alt-nonfur-materials'], welfareConcerns:['Restricted movement and exploration','Barren cages','Leg and paw problems','Stress linked to housing conditions'], sourceIds:['src-efsa-fur-animals-2025'], sensitiveContent:true });
  addAnimal({ id:'animal-raccoon-dog', commonName:'Raccoon dogs', singularName:'Raccoon dog', scientificGroups:['Nyctereutes procyonoides'], emoji:'🦝', summary:'Raccoon dogs are canids farmed for fur and included in EFSA’s assessment of European fur-production systems.', industries:['Fur'], categories:['Farmed','Materials'], useIds:['use-fur'], alternativeIds:['alt-nonfur-materials'], welfareConcerns:['Restricted movement and exploration','Barren cages','Leg and paw problems','Sensory overstimulation'], sourceIds:['src-efsa-fur-animals-2025'], sensitiveContent:true });
  addAnimal({ id:'animal-chinchilla', commonName:'Chinchillas', singularName:'Chinchilla', scientificGroups:['Chinchilla lanigera'], emoji:'🐭', summary:'Chinchillas are kept as companions and are also farmed for fur. EFSA notes the importance of daily sand bathing and access to shelter.', industries:['Fur','Companionship'], categories:['Farmed','Materials','Companionship'], useIds:['use-fur','use-companionship','use-breeding-pet-trade'], alternativeIds:['alt-nonfur-materials','alt-adoption-rescue'], welfareConcerns:['Restricted movement and exploration','Lack of sand-bathing opportunity','Lack of shelter','Stress during handling'], sourceIds:['src-efsa-fur-animals-2025'], sensitiveContent:true });
  addAnimal({ id:'animal-horse-donkey', commonName:'Horses and donkeys', singularName:'Horse or donkey', scientificGroups:['Equus caballus','Equus asinus'], emoji:'🐴', summary:'Equids are used for riding, transport, pack work, traction, sport, entertainment and companionship; their roles vary substantially by region.', industries:['Transport and traction','Sport and entertainment','Companionship'], categories:['Labor','Entertainment','Companionship'], useIds:['use-work-transport','use-entertainment','use-companionship','use-breeding-pet-trade'], alternativeIds:['alt-mechanical-transport','alt-animal-free-entertainment','alt-adoption-rescue'], welfareConcerns:['Overwork','Harness and load injuries','Inadequate food, water or veterinary care','Transport'], sourceIds:['src-fao-draft-animals-nigeria'], sensitiveContent:true });
  addAnimal({ id:'animal-research-rodents', commonName:'Mice, rats, guinea pigs and hamsters', singularName:'Research rodent', scientificGroups:['Mus musculus','Rattus norvegicus','Cavia porcellus','Mesocricetus auratus'], emoji:'🐁', summary:'Rodents are used in research, testing and teaching. U.S. Animal Welfare Act coverage differs: guinea pigs and hamsters are included, while purpose-bred rats of genus Rattus and mice of genus Mus are excluded from that Act’s regulatory definition.', industries:['Research','Testing','Teaching'], categories:['Research'], useIds:['use-research-testing'], alternativeIds:['alt-non-animal-research'], welfareConcerns:['Procedure-related pain or distress','Housing and social needs','Endpoint decisions'], sourceIds:['src-usda-animal-welfare-act','src-usda-awa-quick-reference','src-usda-three-rs'], sensitiveContent:true });
  addAnimal({ id:'animal-nonhuman-primate', commonName:'Nonhuman primates', singularName:'Nonhuman primate', scientificGroups:['Multiple primate species'], emoji:'🐒', summary:'Multiple nonhuman-primate species are used in research, testing, teaching and exhibition; the U.S. Animal Welfare Act specifically includes nonhuman primates within its covered definition.', industries:['Research','Testing','Exhibition'], categories:['Research','Entertainment'], useIds:['use-research-testing','use-entertainment'], alternativeIds:['alt-non-animal-research','alt-animal-free-entertainment'], welfareConcerns:['Procedure-related harms','Complex social and environmental needs','Transport and captive housing'], sourceIds:['src-usda-animal-welfare-act','src-usda-awa-quick-reference','src-usda-three-rs'], sensitiveContent:true });


  addAnimal({ id:'animal-coyote', commonName:'Coyotes', singularName:'Coyote', scientificGroups:['Canis latrans'], emoji:'🐺', summary:'Coyotes are wild North American canids. They are hunted or trapped as furbearers in jurisdictions including Illinois and are also targeted in wildlife-conflict and livestock-protection programs.', industries:['Fur and trapping','Wildlife conflict management','Research'], categories:['Materials','Research'], useIds:['use-wildlife-hunting-trapping','use-wildlife-conflict-control','use-research-testing'], alternativeIds:['alt-nonfur-materials','alt-nonlethal-wildlife-management','alt-non-animal-research'], welfareConcerns:['Trap injuries and restraint','Shooting or lethal-control methods','Conflict created or intensified by intentional feeding'], sourceIds:['src-idnr-furbearers','src-usda-coyote-fladry'], sensitiveContent:true });

  // ---- Animal Uses ----
  const animalUses = [];
  function addUse(u) { animalUses.push({ id:u.id, title:u.title, category:u.category || 'Food', animalIds:u.animalIds || [], summary:u.summary || '', outputs:u.outputs || [], derivedIngredientIds:u.derivedIngredientIds || [], commonProductTypes:u.commonProductTypes || [], commonPractices:u.commonPractices || [], welfareConcerns:u.welfareConcerns || [], alternatives:u.alternatives || [], relatedProductIds:u.relatedProductIds || [], relatedRecipeIds:u.relatedRecipeIds || [], articleIds:u.articleIds || [], sourceIds:u.sourceIds || [], sensitiveContent:u.sensitiveContent || false, needsResearch:u.needsResearch !== undefined ? u.needsResearch : !(u.sourceIds && u.sourceIds.length) }); }

  addUse({ id:'use-dairy', title:'Milk and dairy production', category:'Food', animalIds:['animal-cattle','animal-sheep','animal-goat'], summary:'Milk from domesticated mammals is processed into drinking milk, cream, butter, cheese, yogurt and other ingredients.', outputs:['Milk','Cream','Butter','Cheese','Yogurt','Whey','Casein'], derivedIngredientIds:['ingredient-casein','ingredient-whey','ingredient-lactose'], commonProductTypes:['Dairy foods','Baked goods','Confectionery','Protein powders'], commonPractices:['Breeding and lactation management','Milking','Calf or kid management'], welfareConcerns:['Udder health','Lameness','Housing','Separation practices'], alternatives:['Plant milks','Plant yogurts','Plant cheeses','Vegan butter'], sourceIds:['src-efsa-dairy-cows-2023','src-fao-animal-products-definitions'], sensitiveContent:true });
  addUse({ id:'use-beef', title:'Beef and veal production', category:'Food', animalIds:['animal-cattle'], summary:'Cattle and calves are raised or finished for meat, with hides, fat, bones and other tissues entering by-product streams.', outputs:['Beef','Veal','Fat','Hides','Bones'], commonProductTypes:['Ground meat','Steaks','Roasts','Prepared foods'], commonPractices:['Pasture or feedlot production','Transport','Slaughter'], welfareConcerns:['Heat stress','Lameness','Transport','Slaughter'], alternatives:['Legumes','Tofu or tempeh','Seitan','Plant-based meat products'], sourceIds:['src-fao-animal-products-definitions'], sensitiveContent:true });
  addUse({ id:'use-pork', title:'Pork production', category:'Food', animalIds:['animal-pig'], summary:'Pigs are raised for fresh and processed meat; fat, skin and other tissues may be used as ingredients or materials.', outputs:['Pork','Bacon','Ham','Sausage','Lard'], derivedIngredientIds:['ingredient-lard','ingredient-gelatin'], commonProductTypes:['Fresh meat','Cured meat','Rendered fat','Gelatin products'], commonPractices:['Breeding and farrowing','Growing and finishing','Transport','Slaughter'], welfareConcerns:['Restricted housing','Tail biting','Heat stress','Transport'], alternatives:['Legumes','Seitan','Tempeh','Plant-based meat products'], sourceIds:['src-efsa-pigs-2022','src-fao-animal-products-definitions'], sensitiveContent:true });
  addUse({ id:'use-poultry', title:'Poultry meat production', category:'Food', animalIds:['animal-chicken','animal-turkey','animal-duck-goose'], summary:'Chickens, turkeys, ducks and geese are raised for meat, with feathers and other by-products sometimes collected.', outputs:['Poultry meat','Fat','Feathers'], commonProductTypes:['Whole birds','Cuts','Ground poultry','Prepared foods'], commonPractices:['Hatchery production','Indoor or outdoor rearing','Transport','Slaughter'], welfareConcerns:['Stocking density','Mobility problems','Thermal stress','Transport'], alternatives:['Tofu','Tempeh','Seitan','Legumes','Plant-based poultry products'], sourceIds:['src-efsa-broilers-2023','src-efsa-birds-rabbits-transport-2022'], sensitiveContent:true });
  addUse({ id:'use-eggs', title:'Egg production', category:'Food', animalIds:['animal-chicken','animal-duck-goose'], summary:'Bird eggs are sold whole or processed into liquid, dried and separated egg ingredients.', outputs:['Shell eggs','Liquid egg','Dried egg','Albumen','Yolk'], derivedIngredientIds:['ingredient-albumen'], commonProductTypes:['Breakfast foods','Baked goods','Mayonnaise','Pasta'], commonPractices:['Layer housing','Egg collection','Beak treatment in some systems'], welfareConcerns:['Cage restriction','Bone health','Beak treatment','End-of-lay handling'], alternatives:['Tofu scramble','Chickpea flour','Mung-bean egg products','Flax or chia gel for baking'], sourceIds:['src-efsa-laying-hens-2023','src-fao-animal-products-definitions'], sensitiveContent:true });
  addUse({ id:'use-small-ruminant-meat', title:'Sheep and goat meat production', category:'Food', animalIds:['animal-sheep','animal-goat'], summary:'Sheep and goats are raised for lamb, mutton or goat meat, often alongside milk, fiber or skin production.', outputs:['Lamb','Mutton','Goat meat','Hides'], commonProductTypes:['Fresh meat','Ground meat','Prepared dishes'], commonPractices:['Pasture or housed production','Transport','Slaughter'], welfareConcerns:['Thermal stress','Hunger and thirst during transport','Handling and slaughter'], alternatives:['Lentils and beans','Seitan','Mushrooms','Plant-based meat products'], sourceIds:['src-efsa-small-ruminants-transport-2022','src-fao-animal-products-definitions'], sensitiveContent:true });
  addUse({ id:'use-rabbit-meat', title:'Rabbit meat production', category:'Food', animalIds:['animal-rabbit'], summary:'Rabbits are farmed for meat in a range of housing systems.', outputs:['Rabbit meat','Skins'], commonProductTypes:['Whole carcasses','Meat cuts'], commonPractices:['Cage or pen housing','Transport','Slaughter'], welfareConcerns:['Restricted movement','Injuries','Heat stress','Transport'], alternatives:['Legumes','Seitan','Plant-based meat products'], sourceIds:['src-efsa-rabbits-2020','src-efsa-birds-rabbits-transport-2022'], sensitiveContent:true });
  addUse({ id:'use-fishing-aquaculture', title:'Fishing and aquaculture', category:'Food', animalIds:['animal-fish','animal-shellfish'], summary:'Aquatic animals are captured from wild populations or farmed for food and other products such as meal and oil.', outputs:['Fish and shellfish meat','Fishmeal','Fish oil'], commonProductTypes:['Fresh and frozen seafood','Canned seafood','Supplements','Animal feed'], commonPractices:['Nets, lines and traps','Aquaculture housing','Transport and slaughter'], welfareConcerns:['Capture stress','Bycatch','Water quality','Stocking density','Killing methods'], alternatives:['Tofu and tempeh preparations','Plant-based seafood products','Seaweed flavors','Algae-derived omega-3'], sourceIds:['src-efsa-fish-welfare-2009','src-fao-animal-products-definitions'], sensitiveContent:true });
  addUse({ id:'use-beekeeping', title:'Commercial beekeeping', category:'Food and agriculture', animalIds:['animal-bees'], summary:'Managed colonies provide pollination services and products including honey and beeswax.', outputs:['Honey','Beeswax','Propolis','Royal jelly','Pollination services'], derivedIngredientIds:['ingredient-honey','ingredient-beeswax','ingredient-propolis','ingredient-royal-jelly'], commonProductTypes:['Sweeteners','Candles','Cosmetics','Supplements'], commonPractices:['Hive inspection','Colony movement','Honey extraction','Disease management'], welfareConcerns:['Transport','Pesticide exposure','Parasites and disease','Hive manipulation'], alternatives:['Maple, date or agave syrup','Plant or synthetic waxes'], sourceIds:['src-usda-honey-bee-health','src-fao-animal-products-definitions'] });
  addUse({ id:'use-leather', title:'Leather and skin production', category:'Materials', animalIds:['animal-cattle','animal-pig','animal-sheep','animal-goat'], summary:'Animal hides and skins are preserved and tanned into leather or suede for clothing, accessories, upholstery and industrial goods.', outputs:['Leather','Suede'], commonProductTypes:['Shoes','Bags','Belts','Clothing','Furniture','Vehicle interiors'], commonPractices:['Hide recovery','Curing','Tanning','Finishing'], welfareConcerns:['Animal-origin supply chain','Chemical and worker-safety impacts vary by tanning process'], alternatives:['Canvas','Cork','Microfiber','Recycled synthetics','Verified plant-composite materials'], sourceIds:['src-fao-animal-products-definitions'], sensitiveContent:true });
  addUse({ id:'use-wool', title:'Wool and animal-hair fiber production', category:'Materials', animalIds:['animal-sheep','animal-goat'], summary:'Fleece or hair is removed and processed into textile fibers including wool, cashmere and mohair.', outputs:['Wool','Cashmere','Mohair'], commonProductTypes:['Clothing','Blankets','Carpets','Insulation'], commonPractices:['Shearing or combing','Sorting','Scouring','Spinning'], welfareConcerns:['Handling and restraint','Shearing injuries','Thermal exposure after shearing'], alternatives:['Cotton','Hemp','Linen','Lyocell','Recycled synthetic insulation'], sourceIds:['src-fao-animal-products-definitions'], sensitiveContent:true });
  addUse({ id:'use-feathers-down', title:'Feather and down production', category:'Materials', animalIds:['animal-chicken','animal-turkey','animal-duck-goose'], summary:'Feathers and down are used as filling, insulation, decoration and in some specialty products.', outputs:['Down','Feathers'], commonProductTypes:['Jackets','Comforters','Pillows','Sleeping bags'], commonPractices:['Collection after slaughter or through other supply systems','Cleaning and grading'], welfareConcerns:['Traceability','Collection method','Handling'], alternatives:['Recycled polyester fill','Kapok','Cellulose-based fill'], sourceIds:['src-fao-animal-products-definitions'], sensitiveContent:true });
  addUse({ id:'use-fur', title:'Fur production', category:'Materials', animalIds:['animal-rabbit','animal-mink','animal-fox','animal-raccoon-dog','animal-chinchilla'], summary:'Animal pelts with hair attached are processed for clothing, trim and accessories; additional species may be involved beyond this introductory record.', outputs:['Fur pelts','Fur trim'], commonProductTypes:['Coats','Trim','Hats','Accessories'], commonPractices:['Captive rearing or trapping','Pelt processing'], welfareConcerns:['Confinement','Trapping injuries','Killing methods'], alternatives:['Faux fur','Fleece','Recycled textile pile'], sourceIds:['src-fao-silkworm-cocoons'], needsResearch:true, sensitiveContent:true });
  addUse({ id:'use-silk', title:'Silk production', category:'Materials', animalIds:['animal-silkworm'], summary:'Silkworms spin cocoons made of silk filament; cocoons are harvested and processed to obtain fiber.', outputs:['Raw silk','Silk yarn','Silk fabric'], commonProductTypes:['Clothing','Bedding','Accessories','Thread'], commonPractices:['Silkworm rearing','Cocoon harvesting','Reeling and spinning'], welfareConcerns:['Conventional cocoon processing generally prevents adult moth emergence'], alternatives:['Lyocell','Cupro','Recycled satin fabrics','Plant-based fibers'], sourceIds:['src-fao-silkworm-cocoons'], sensitiveContent:true });
  addUse({ id:'use-carmine', title:'Cochineal and carmine production', category:'Ingredients and colorants', animalIds:['animal-cochineal'], summary:'Cochineal insects are processed into cochineal extract and carmine color additives used in some foods, drugs and cosmetics; U.S. labels must identify them by name.', outputs:['Cochineal extract','Carmine'], commonProductTypes:['Colored foods','Cosmetics','Some drugs'], commonPractices:['Insect collection','Drying and pigment extraction'], welfareConcerns:['Animal-derived insect material'], alternatives:['Beet-derived colors','Anthocyanins','Lycopene','Synthetic colors where acceptable'], sourceIds:['src-fda-carmine-labeling'], sensitiveContent:true });
  addUse({ id:'use-gelatin-rendering', title:'Gelatin and rendered animal ingredients', category:'Ingredients', animalIds:['animal-cattle','animal-pig'], summary:'Bones, skins, connective tissues and fats can be processed into gelatin, tallow, lard and related ingredients.', outputs:['Gelatin','Tallow','Lard'], derivedIngredientIds:['ingredient-gelatin','ingredient-tallow','ingredient-lard'], commonProductTypes:['Confectionery','Capsules','Desserts','Soaps','Cosmetics'], commonPractices:['Rendering','Collagen extraction','Refining'], welfareConcerns:['Animal-origin by-product supply chain'], alternatives:['Agar','Pectin','Carrageenan','Plant oils and waxes'], sourceIds:['src-fao-animal-products-definitions'], sensitiveContent:true });
  addUse({ id:'use-research-testing', title:'Research, testing and teaching', category:'Research', animalIds:['animal-pig','animal-fish','animal-rabbit','animal-laboratory'], summary:'Animals may be used in biomedical research, product or chemical testing, education and training. Regulations and covered species vary by jurisdiction.', outputs:['Research data','Testing data','Training experience'], commonProductTypes:['Medicines','Chemicals','Medical devices','Educational programs'], commonPractices:['Housing and husbandry','Experimental procedures','Observation and sampling'], welfareConcerns:['Pain or distress','Social and behavioral restriction','Endpoint and euthanasia decisions'], alternatives:['Replacement methods','Reduction in numbers','Refinement of procedures','In vitro systems','Computer models'], sourceIds:['src-usda-animal-welfare-act','src-usda-three-rs'], sensitiveContent:true });
  addUse({ id:'use-entertainment', title:'Exhibition and entertainment', category:'Entertainment', animalIds:['animal-rabbit','animal-dog','animal-cat','animal-horse-donkey','animal-nonhuman-primate'], summary:'Animals may be displayed, exhibited or trained for public entertainment; this introductory record is not a complete species inventory.', outputs:['Exhibitions','Performances','Visitor experiences'], commonProductTypes:['Zoos','Shows','Traveling exhibitions'], commonPractices:['Captive housing','Training','Transport','Public display'], welfareConcerns:['Housing quality','Transport','Training methods','Behavioral restriction'], alternatives:['Animal-free performances','Virtual and documentary experiences'], sourceIds:['src-usda-animal-welfare-act'], needsResearch:true, sensitiveContent:true });
  addUse({ id:'use-companionship', title:'Companionship', category:'Companionship', animalIds:['animal-rabbit','animal-dog','animal-cat','animal-chinchilla','animal-horse-donkey'], summary:'Animals kept as companions depend on guardians for appropriate housing, nutrition, veterinary care and opportunities for species-typical behavior.', outputs:['Companionship'], commonProductTypes:['Pet trade','Adoption and rescue'], commonPractices:['Breeding','Sale or adoption','Home care'], welfareConcerns:['Abandonment','Inadequate housing','Poor breeding practices'], alternatives:['Adoption rather than commercial breeding'], sourceIds:['src-usda-animal-welfare-act'], needsResearch:true });


  addUse({ id:'use-breeding-pet-trade', title:'Commercial breeding and pet trade', category:'Companionship', animalIds:['animal-dog','animal-cat','animal-rabbit','animal-chinchilla','animal-horse-donkey'], summary:'Animals may be bred, transported and sold as pets or companion animals. U.S. federal requirements apply to covered dealers and activities, but coverage and licensing depend on the circumstances.', outputs:['Companion animals','Commercial sales'], commonProductTypes:['Breeders','Dealers','Pet stores','Online sales'], commonPractices:['Breeding','Weaning','Housing','Transport','Sale'], welfareConcerns:['High-volume breeding','Inadequate socialization or care','Transport stress','Abandonment'], alternatives:['Adoption from shelters or rescues','Supporting responsible rehoming'], sourceIds:['src-usda-animal-welfare-act','src-usda-awa-quick-reference'], sensitiveContent:true });
  addUse({ id:'use-work-transport', title:'Work, transport and assistance', category:'Labor', animalIds:['animal-dog','animal-horse-donkey'], summary:'Dogs and equids perform varied roles including assistance, security, detection, herding, riding, pack transport and traction.', outputs:['Transport','Traction','Detection','Security','Assistance'], commonProductTypes:['Working-animal services','Riding and transport'], commonPractices:['Training','Harnessing or saddling','Work schedules','Transport'], welfareConcerns:['Overwork','Heat stress','Equipment injuries','Insufficient rest, food, water or veterinary care'], alternatives:['Mechanical transport where appropriate','Human or technological detection and mobility systems where appropriate'], sourceIds:['src-usda-animal-welfare-act','src-fao-draft-animals-nigeria'], sensitiveContent:true });


  addUse({ id:'use-wildlife-hunting-trapping', title:'Wildlife hunting and trapping for fur', category:'Materials', animalIds:['animal-coyote'], summary:'Wild furbearers may be hunted or trapped under jurisdiction-specific seasons, licensing requirements and harvest rules, with pelts entering fur markets or craft uses.', outputs:['Pelts','Fur products'], commonProductTypes:['Garment trim','Hats','Craft materials'], commonPractices:['Hunting','Trapping','Pelt preparation'], welfareConcerns:['Injury and restraint in traps','Non-target capture','Lethal harvest'], alternatives:['Faux fur','Fleece','Recycled textile pile'], sourceIds:['src-idnr-furbearers'], sensitiveContent:true });
  addUse({ id:'use-wildlife-conflict-control', title:'Wildlife conflict and predator control', category:'Wildlife management', animalIds:['animal-coyote'], summary:'Coyotes may be managed in response to conflicts involving livestock, property, pets or public safety. Programs can combine prevention, nonlethal deterrence and lethal methods.', outputs:['Conflict reduction','Livestock-protection services'], commonProductTypes:['Wildlife-management services'], commonPractices:['Removing food attractants','Exclusion','Fladry and hazing','Trapping or lethal removal'], welfareConcerns:['Injury or death from control methods','Dependent young','Effects on non-target animals'], alternatives:['Secure attractants','Livestock husbandry and guarding','Exclusion fencing','Fladry or context-appropriate hazing'], sourceIds:['src-usda-coyote-fladry'], sensitiveContent:true });

  // ---- Ingredients ----
  const ingredients = [];
  
  function addIngredient(i) {
    ingredients.push({
      id: i.id || 'ingredient-' + i.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: i.name || '',
      aliases: i.aliases || [],
      status: i.status || 'unknown',
      animalIds: i.animalIds || [],
      useIds: i.useIds || [],
      commonSources: i.commonSources || [],
      possibleNonAnimalSources: i.possibleNonAnimalSources || [],
      commonlyFoundIn: i.commonlyFoundIn || [],
      purpose: i.purpose || '',
      alternativeIds: i.alternativeIds || [],
      verificationAdvice: i.verificationAdvice || '',
      sourceIds: i.sourceIds || [],
      needsResearch: i.needsResearch !== undefined
        ? i.needsResearch
        : true
    });
  }
  
  // Definite or conventionally animal-derived ingredients
  
  addIngredient({
    id: 'ingredient-casein',
    name: 'Casein',
    aliases: ['caseinate', 'sodium caseinate', 'calcium caseinate'],
    status: 'animal-derived',
    animalIds: ['animal-cattle'],
    useIds: ['use-dairy'],
    commonSources: ["Cow's milk"],
    possibleNonAnimalSources: [],
    commonlyFoundIn: [
      'Cheese',
      'Yogurt',
      'Protein powders',
      'Non-dairy creamers'
    ],
    purpose: 'Protein, thickener, emulsifier',
    alternativeIds: [],
    verificationAdvice: 'Avoid; choose plant-based protein or dairy-free alternatives.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-whey',
    name: 'Whey',
    aliases: ['whey protein', 'whey concentrate', 'whey isolate'],
    status: 'animal-derived',
    animalIds: ['animal-cattle'],
    useIds: ['use-dairy'],
    commonSources: ["Cow's milk"],
    possibleNonAnimalSources: [],
    commonlyFoundIn: [
      'Protein shakes',
      'Nutrition bars',
      'Baked goods'
    ],
    purpose: 'Protein source, texturizer',
    alternativeIds: [],
    verificationAdvice: 'Avoid; plant-based protein powders are widely available.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-lactose',
    name: 'Lactose',
    aliases: ['milk sugar'],
    status: 'animal-derived',
    animalIds: ['animal-cattle'],
    useIds: ['use-dairy'],
    commonSources: ["Mammalian milk, commonly cow's milk"],
    possibleNonAnimalSources: [],
    commonlyFoundIn: [
      'Dairy products',
      'Tablet excipients',
      'Baked goods'
    ],
    purpose: 'Sweetener, filler, excipient',
    alternativeIds: [],
    verificationAdvice: 'Avoid in food; ask a pharmacist about suitable medication options when necessary.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-milk-fat',
    name: 'Milk fat',
    aliases: ['butterfat', 'anhydrous milk fat', 'AMF'],
    status: 'animal-derived',
    animalIds: ['animal-cattle'],
    useIds: ['use-dairy'],
    commonSources: ["Cow's milk"],
    possibleNonAnimalSources: [],
    commonlyFoundIn: [
      'Butter',
      'Cream',
      'Ice cream',
      'Baked goods'
    ],
    purpose: 'Fat source, flavor, texture',
    alternativeIds: [],
    verificationAdvice: 'Avoid; choose a clearly labeled plant-based fat or vegan butter.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-gelatin',
    name: 'Gelatin',
    aliases: ['gelatine', 'E441'],
    status: 'animal-derived',
    animalIds: ['animal-cattle', 'animal-pig'],
    useIds: ['use-beef', 'use-pork'],
    commonSources: [
      'Animal collagen from skin, bones, and connective tissue'
    ],
    possibleNonAnimalSources: [],
    commonlyFoundIn: [
      'Gummies',
      'Marshmallows',
      'Capsules',
      'Gel desserts',
      'Photographic film'
    ],
    purpose: 'Gelling agent, thickener, stabilizer',
    alternativeIds: [],
    verificationAdvice: 'Avoid; agar, carrageenan, and pectin can serve similar functions in some products.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-collagen',
    name: 'Collagen',
    aliases: ['hydrolyzed collagen', 'collagen peptides'],
    status: 'animal-derived',
    animalIds: [],
    useIds: [],
    commonSources: [
      'Animal skin, bones, and connective tissue'
    ],
    possibleNonAnimalSources: [],
    commonlyFoundIn: [
      'Cosmetics',
      'Supplements',
      'Bone broth',
      'Gummies'
    ],
    purpose: 'Structural protein or supplement ingredient',
    alternativeIds: [],
    verificationAdvice: 'Avoid unless the product explicitly identifies a non-animal alternative; “collagen builder” products do not contain collagen itself.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-lard',
    name: 'Lard',
    aliases: ['pork fat'],
    status: 'animal-derived',
    animalIds: ['animal-pig'],
    useIds: ['use-pork'],
    commonSources: ['Rendered pig fat'],
    possibleNonAnimalSources: [],
    commonlyFoundIn: [
      'Baked goods',
      'Refried beans',
      'Frying fats'
    ],
    purpose: 'Fat, shortening',
    alternativeIds: [],
    verificationAdvice: 'Avoid; use a suitable vegetable oil or plant-based shortening.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-tallow',
    name: 'Tallow',
    aliases: ['beef tallow'],
    status: 'animal-derived',
    animalIds: ['animal-cattle'],
    useIds: ['use-beef'],
    commonSources: [
      'Rendered ruminant fat, commonly cattle or sheep'
    ],
    possibleNonAnimalSources: [],
    commonlyFoundIn: [
      'Soap',
      'Candles',
      'Cosmetics',
      'Frying fats'
    ],
    purpose: 'Fat source, soap base',
    alternativeIds: [],
    verificationAdvice: 'Avoid; choose products made with identified plant oils or plant waxes.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-albumen',
    name: 'Albumen',
    aliases: ['ovalbumin', 'egg white', 'egg albumen'],
    status: 'animal-derived',
    animalIds: ['animal-chicken'],
    useIds: ['use-eggs'],
    commonSources: ['Egg white'],
    possibleNonAnimalSources: [],
    commonlyFoundIn: [
      'Meringues',
      'Baked goods',
      'Soufflés',
      'Candies'
    ],
    purpose: 'Protein, foaming agent, binder',
    alternativeIds: [],
    verificationAdvice: 'Avoid; aquafaba, flax mixtures, or commercial vegan egg replacers may work depending on the recipe.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-egg-yolk',
    name: 'Egg yolk',
    aliases: ['dried egg yolk', 'powdered egg yolk'],
    status: 'animal-derived',
    animalIds: ['animal-chicken'],
    useIds: ['use-eggs'],
    commonSources: ['Eggs'],
    possibleNonAnimalSources: [],
    commonlyFoundIn: [
      'Mayonnaise',
      'Baked goods',
      'Pasta',
      'Ice cream'
    ],
    purpose: 'Emulsifier, fat source, color',
    alternativeIds: [],
    verificationAdvice: 'Avoid; choose vegan mayonnaise or an appropriate plant-based binder or emulsifier.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-lysozyme',
    name: 'Lysozyme',
    aliases: ['muramidase', 'E1105'],
    status: 'may-be-animal-derived',
    animalIds: ['animal-chicken'],
    useIds: ['use-eggs'],
    commonSources: [
      'Egg white',
      'Microbial or recombinant production'
    ],
    possibleNonAnimalSources: [
      'Verified microbial or recombinant production'
    ],
    commonlyFoundIn: [
      'Some cheeses',
      'Wine',
      'Beer'
    ],
    purpose: 'Preservative, antimicrobial enzyme',
    alternativeIds: [],
    verificationAdvice: 'Verify its production source with the manufacturer; egg-derived lysozyme is not vegan.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-isinglass',
    name: 'Isinglass',
    aliases: ['fish gelatin', 'ichthyocolla'],
    status: 'animal-derived',
    animalIds: ['animal-fish'],
    useIds: ['use-fishing-aquaculture'],
    commonSources: ['Fish swim bladders'],
    possibleNonAnimalSources: [],
    commonlyFoundIn: [
      'Some beer and wine as a processing aid'
    ],
    purpose: 'Clarifying or fining agent',
    alternativeIds: [],
    verificationAdvice: 'Choose beverages labeled vegan or confirmed to use non-animal fining methods.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-carmine',
    name: 'Carmine',
    aliases: [
      'cochineal extract',
      'Natural Red 4',
      'E120',
      'C.I. 75470'
    ],
    status: 'animal-derived',
    animalIds: [],
    useIds: [],
    commonSources: ['Cochineal insects'],
    possibleNonAnimalSources: [],
    commonlyFoundIn: [
      'Some red or pink foods',
      'Lipstick',
      'Blush'
    ],
    purpose: 'Red color additive',
    alternativeIds: [],
    verificationAdvice: 'Avoid carmine and cochineal extract; choose products using a non-animal color.',
    sourceIds: ['src-fda-color-additives'],
    needsResearch: false
  });
  
  addIngredient({
    id: 'ingredient-shellac',
    name: 'Shellac',
    aliases: [
      "confectioner's glaze",
      'E904',
      'pharmaceutical glaze'
    ],
    status: 'animal-derived',
    animalIds: [],
    useIds: [],
    commonSources: [
      'Resinous secretion produced by lac insects'
    ],
    possibleNonAnimalSources: [],
    commonlyFoundIn: [
      'Candy coatings',
      'Fruit coatings',
      'Pills',
      'Furniture finishes'
    ],
    purpose: 'Glazing agent, coating',
    alternativeIds: [],
    verificationAdvice: 'Avoid; look for products using identified plant waxes or cellulose-based coatings.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-honey',
    name: 'Honey',
    aliases: ['honey powder'],
    status: 'animal-derived',
    animalIds: ['animal-bees'],
    useIds: ['use-beekeeping'],
    commonSources: ['Honey produced by bees'],
    possibleNonAnimalSources: [],
    commonlyFoundIn: [
      'Sweeteners',
      'Cosmetics',
      'Medicines',
      'Baked goods'
    ],
    purpose: 'Sweetener, humectant',
    alternativeIds: [],
    verificationAdvice: 'Avoid; alternatives include maple, date, agave, or brown-rice syrup where appropriate.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-beeswax',
    name: 'Beeswax',
    aliases: ['cera alba', 'E901'],
    status: 'animal-derived',
    animalIds: ['animal-bees'],
    useIds: ['use-beekeeping'],
    commonSources: ['Wax produced by bees'],
    possibleNonAnimalSources: [],
    commonlyFoundIn: [
      'Candles',
      'Cosmetics',
      'Chewing gum',
      'Fruit coatings'
    ],
    purpose: 'Thickener, coating, emulsifier',
    alternativeIds: [],
    verificationAdvice: 'Avoid; choose products made with identified plant waxes such as carnauba or candelilla.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-propolis',
    name: 'Propolis',
    aliases: ['bee propolis'],
    status: 'animal-derived',
    animalIds: ['animal-bees'],
    useIds: ['use-beekeeping'],
    commonSources: [
      'Resinous material collected and processed by bees'
    ],
    possibleNonAnimalSources: [],
    commonlyFoundIn: [
      'Supplements',
      'Cosmetics',
      'Oral-care products'
    ],
    purpose: 'Product marketed for antimicrobial or protective properties',
    alternativeIds: [],
    verificationAdvice: 'Avoid; choose a propolis-free product.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-royal-jelly',
    name: 'Royal jelly',
    aliases: [],
    status: 'animal-derived',
    animalIds: ['animal-bees'],
    useIds: ['use-beekeeping'],
    commonSources: ['Secretion produced by worker bees'],
    possibleNonAnimalSources: [],
    commonlyFoundIn: ['Supplements', 'Cosmetics'],
    purpose: 'Supplement or cosmetic ingredient',
    alternativeIds: [],
    verificationAdvice: 'Avoid; choose a product without royal jelly.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-lanolin',
    name: 'Lanolin',
    aliases: [
      'wool wax',
      'wool fat',
      'wool grease',
      'adeps lanae'
    ],
    status: 'animal-derived',
    animalIds: [],
    useIds: [],
    commonSources: ['Grease obtained from sheep wool'],
    possibleNonAnimalSources: [],
    commonlyFoundIn: [
      'Cosmetics',
      'Lotions',
      'Medications',
      'Lip balms'
    ],
    purpose: 'Emollient, moisturizer',
    alternativeIds: [],
    verificationAdvice: 'Avoid in consumer products; do not stop necessary medication—ask a pharmacist about suitable alternatives.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-keratin',
    name: 'Keratin',
    aliases: ['hydrolyzed keratin', 'keratin protein'],
    status: 'may-be-animal-derived',
    animalIds: [],
    useIds: [],
    commonSources: [
      'Hair, wool, horns, hooves, or feathers',
      'Emerging fermentation-derived production'
    ],
    possibleNonAnimalSources: [
      'Manufacturer-verified fermentation-derived keratin'
    ],
    commonlyFoundIn: [
      'Hair-care products',
      'Nail treatments',
      'Cosmetics'
    ],
    purpose: 'Protein or conditioning ingredient',
    alternativeIds: [],
    verificationAdvice: 'Verify the source; conventional keratin is animal-derived, while some newer versions may be fermentation-derived.',
    sourceIds: [],
    needsResearch: true
  });
  
  // Source-variable ingredients
  
  addIngredient({
    id: 'ingredient-l-cysteine',
    name: 'L-Cysteine',
    aliases: [
      'E920',
      'cysteine',
      'L-cysteine hydrochloride'
    ],
    status: 'may-be-animal-derived',
    animalIds: [],
    useIds: [],
    commonSources: [
      'Poultry feathers',
      'Human hair',
      'Pig bristles',
      'Microbial fermentation',
      'Chemical synthesis'
    ],
    possibleNonAnimalSources: [
      'Microbial fermentation',
      'Chemical synthesis using non-animal raw materials'
    ],
    commonlyFoundIn: [
      'Bread',
      'Bakery goods',
      'Flour treatment'
    ],
    purpose: 'Dough conditioner, reducing agent',
    alternativeIds: [],
    verificationAdvice: 'Verify the manufacturing source; microbial-fermentation and chemically synthesized versions may avoid animal-derived raw materials.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-vitamin-d3',
    name: 'Vitamin D3',
    aliases: ['cholecalciferol'],
    status: 'may-be-animal-derived',
    animalIds: [],
    useIds: [],
    commonSources: [
      'Lanolin obtained from sheep wool',
      'Lichen when specifically identified by the manufacturer'
    ],
    possibleNonAnimalSources: [
      'Lichen-derived vitamin D3'
    ],
    commonlyFoundIn: [
      'Supplements',
      'Fortified foods',
      'Medications'
    ],
    purpose: 'Vitamin, nutrient',
    alternativeIds: [],
    verificationAdvice: 'Vitamin D3 is typically produced from lanolin obtained from sheep wool. Choose a product explicitly labeled vegan or lichen-derived, or use vitamin D2 when appropriate.',
    sourceIds: ['src-nih-ods-vitamind'],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-glycerin',
    name: 'Glycerin',
    aliases: ['glycerol', 'E422'],
    status: 'may-be-animal-derived',
    animalIds: [],
    useIds: [],
    commonSources: [
      'Vegetable oils',
      'Animal fats',
      'Chemical synthesis'
    ],
    possibleNonAnimalSources: [
      'Plant oils',
      'Verified non-animal synthetic production'
    ],
    commonlyFoundIn: [
      'Cosmetics',
      'Foods',
      'Pharmaceuticals',
      'Soaps'
    ],
    purpose: 'Humectant, sweetener, solvent',
    alternativeIds: [],
    verificationAdvice: 'Verify the source when the product is not labeled vegan; plant-derived glycerin is common, but the name alone does not establish its origin.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-stearic-acid',
    name: 'Stearic acid',
    aliases: ['E570', 'octadecanoic acid'],
    status: 'may-be-animal-derived',
    animalIds: [],
    useIds: [],
    commonSources: [
      'Plant fats and oils',
      'Animal fats'
    ],
    possibleNonAnimalSources: [
      'Cocoa butter',
      'Shea butter',
      'Other identified plant oils'
    ],
    commonlyFoundIn: [
      'Cosmetics',
      'Candles',
      'Soaps',
      'Supplements'
    ],
    purpose: 'Emulsifier, thickener, lubricant',
    alternativeIds: [],
    verificationAdvice: 'Verify the source when a product is not labeled vegan.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-mono-diglycerides',
    name: 'Mono- and diglycerides',
    aliases: [
      'E471',
      'monoglycerides',
      'diglycerides'
    ],
    status: 'may-be-animal-derived',
    animalIds: [],
    useIds: [],
    commonSources: [
      'Vegetable oils',
      'Animal fats'
    ],
    possibleNonAnimalSources: [
      'Identified plant oils'
    ],
    commonlyFoundIn: [
      'Baked goods',
      'Ice cream',
      'Margarine',
      'Nut butters'
    ],
    purpose: 'Emulsifier, stabilizer',
    alternativeIds: [],
    verificationAdvice: 'Verify the source or choose a product labeled vegan; the ingredient name alone does not identify the fat source.',
    sourceIds: [],
    needsResearch: true
  });
  
  // Additional useful ingredient-library entries
  
  addIngredient({
    id: 'ingredient-squalene',
    name: 'Squalene',
    aliases: [],
    status: 'may-be-animal-derived',
    animalIds: ['animal-fish'],
    useIds: ['use-fishing-aquaculture'],
    commonSources: [
      'Shark liver oil',
      'Olive oil',
      'Sugarcane-derived fermentation'
    ],
    possibleNonAnimalSources: [
      'Olive oil',
      'Sugarcane-derived fermentation'
    ],
    commonlyFoundIn: [
      'Cosmetics',
      'Some pharmaceuticals'
    ],
    purpose: 'Emollient or manufacturing intermediate',
    alternativeIds: [],
    verificationAdvice: 'Verify the source; choose plant-derived squalene or squalane.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-chitin',
    name: 'Chitin',
    aliases: [],
    status: 'may-be-animal-derived',
    animalIds: ['animal-fish'],
    useIds: ['use-fishing-aquaculture'],
    commonSources: [
      'Crustacean shells',
      'Fungal cell walls'
    ],
    possibleNonAnimalSources: [
      'Fungal chitin or chitosan'
    ],
    commonlyFoundIn: [
      'Supplements',
      'Industrial materials',
      'Biomedical materials'
    ],
    purpose: 'Structural polysaccharide and material ingredient',
    alternativeIds: [],
    verificationAdvice: 'Verify whether it is crustacean-derived or fungal-derived.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-omega-3',
    name: 'Omega-3',
    aliases: [
      'omega-3 fatty acids',
      'EPA',
      'DHA',
      'ALA'
    ],
    status: 'may-be-animal-derived',
    animalIds: ['animal-fish'],
    useIds: ['use-fishing-aquaculture'],
    commonSources: [
      'Fish oil',
      'Algae oil',
      'Flax',
      'Chia',
      'Other plant sources'
    ],
    possibleNonAnimalSources: [
      'Algae-derived EPA or DHA',
      'Plant-derived ALA'
    ],
    commonlyFoundIn: [
      'Supplements',
      'Fortified foods'
    ],
    purpose: 'Fatty-acid nutrient',
    alternativeIds: [],
    verificationAdvice: 'Choose algae-derived DHA or EPA, or clearly identified plant-derived ALA.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-natural-flavors',
    name: 'Natural Flavors',
    aliases: ['natural flavour', 'natural flavouring'],
    status: 'may-be-animal-derived',
    animalIds: [],
    useIds: [],
    commonSources: [
      'Plant sources',
      'Animal sources',
      'Microbial or other permitted sources'
    ],
    possibleNonAnimalSources: [
      'Plant sources',
      'Microbial sources',
      'Manufacturer-verified vegan sources'
    ],
    commonlyFoundIn: [
      'Foods',
      'Beverages'
    ],
    purpose: 'Flavoring',
    alternativeIds: [],
    verificationAdvice: 'Contact the manufacturer or rely on trustworthy vegan labeling when the source is unclear.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-enzymes',
    name: 'Enzymes',
    aliases: [],
    status: 'may-be-animal-derived',
    animalIds: [],
    useIds: [],
    commonSources: [
      'Microbial fermentation',
      'Plants',
      'Animal tissues'
    ],
    possibleNonAnimalSources: [
      'Microbial sources',
      'Plant sources'
    ],
    commonlyFoundIn: [
      'Foods',
      'Cheese making',
      'Baking',
      'Pharmaceuticals'
    ],
    purpose: 'Processing aid or catalyst',
    alternativeIds: [],
    verificationAdvice: 'Verify the specific enzyme and its production source with the manufacturer.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-lactic-acid',
    name: 'Lactic Acid',
    aliases: ['E270'],
    status: 'usually-plant-or-microbial',
    animalIds: [],
    useIds: [],
    commonSources: [
      'Microbial fermentation of carbohydrates'
    ],
    possibleNonAnimalSources: [
      'Microbial fermentation using non-animal inputs'
    ],
    commonlyFoundIn: [
      'Foods',
      'Beverages',
      'Skin care'
    ],
    purpose: 'Acidulant, preservative, skin-care ingredient',
    alternativeIds: [],
    verificationAdvice: 'Lactic acid is not lactose, but verify processing inputs if strict source confirmation is required.',
    sourceIds: [],
    needsResearch: true
  });
  
  addIngredient({
    id: 'ingredient-lactate',
    name: 'Lactate',
    aliases: [],
    status: 'may-be-animal-derived',
    animalIds: [],
    useIds: [],
    commonSources: [
      'Salts or esters of lactic acid; source and processing vary'
    ],
    possibleNonAnimalSources: [
      'Manufacturer-verified non-animal production'
    ],
    commonlyFoundIn: [
      'Foods',
      'Cosmetics',
      'Medications'
    ],
    purpose: 'Preservative, acidity regulator, moisturizer, or medication ingredient',
    alternativeIds: [],
    verificationAdvice: 'Do not infer its source from the name alone; verify the specific compound and manufacturer.',
    sourceIds: [],
    needsResearch: true
  });

  // ---- Phase 2 ingredient expansion ----
  [
  {
    "id": "ingredient-sodium-caseinate",
    "name": "Sodium caseinate",
    "aliases": [
      "caseinate"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-cattle",
      "animal-goat",
      "animal-sheep"
    ],
    "useIds": [
      "use-dairy"
    ],
    "commonSources": [
      "Milk casein"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Coffee whiteners",
      "Processed foods",
      "Protein products"
    ],
    "purpose": "Milk-derived protein and emulsifier.",
    "alternativeIds": [],
    "verificationAdvice": "Treat as milk-derived; U.S. allergen labeling should identify milk.",
    "sourceIds": [
      "source-fda"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-calcium-caseinate",
    "name": "Calcium caseinate",
    "aliases": [],
    "status": "animal-derived",
    "animalIds": [
      "animal-cattle",
      "animal-goat",
      "animal-sheep"
    ],
    "useIds": [
      "use-dairy"
    ],
    "commonSources": [
      "Milk casein"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Protein powders",
      "Nutrition products",
      "Processed foods"
    ],
    "purpose": "Milk-derived protein and stabilizer.",
    "alternativeIds": [],
    "verificationAdvice": "Treat as milk-derived.",
    "sourceIds": [
      "source-fda"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-milk-powder",
    "name": "Milk powder",
    "aliases": [
      "dry milk",
      "milk solids",
      "nonfat dry milk"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-cattle",
      "animal-goat",
      "animal-sheep"
    ],
    "useIds": [
      "use-dairy"
    ],
    "commonSources": [
      "Milk"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Chocolate",
      "Baked goods",
      "Instant foods",
      "Confectionery"
    ],
    "purpose": "Dry dairy ingredient.",
    "alternativeIds": [],
    "verificationAdvice": "Milk and milk solids are animal-derived.",
    "sourceIds": [
      "source-fda"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-buttermilk",
    "name": "Buttermilk",
    "aliases": [
      "buttermilk powder"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-cattle"
    ],
    "useIds": [
      "use-dairy"
    ],
    "commonSources": [
      "Cow milk"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Baked goods",
      "Dressings",
      "Pancake mixes",
      "Snacks"
    ],
    "purpose": "Dairy ingredient used for flavor, acidity and texture.",
    "alternativeIds": [],
    "verificationAdvice": "Do not confuse with plant-based cultured products.",
    "sourceIds": [
      "source-fda"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-butterfat-ghee",
    "name": "Butterfat and ghee",
    "aliases": [
      "butter oil",
      "anhydrous milk fat",
      "AMF"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-cattle",
      "animal-goat",
      "animal-sheep"
    ],
    "useIds": [
      "use-dairy"
    ],
    "commonSources": [
      "Milk fat"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Cooking fats",
      "Baked goods",
      "Confectionery",
      "Prepared foods"
    ],
    "purpose": "Dairy fat.",
    "alternativeIds": [],
    "verificationAdvice": "Butter oil, anhydrous milk fat and ghee are dairy-derived.",
    "sourceIds": [
      "source-fda"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-lactalbumin",
    "name": "Lactalbumin",
    "aliases": [
      "alpha-lactalbumin"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-cattle"
    ],
    "useIds": [
      "use-dairy"
    ],
    "commonSources": [
      "Milk whey"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Protein supplements",
      "Nutrition products",
      "Processed foods"
    ],
    "purpose": "Milk whey protein.",
    "alternativeIds": [],
    "verificationAdvice": "Treat as milk-derived.",
    "sourceIds": [
      "source-fda"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-lactoferrin",
    "name": "Lactoferrin",
    "aliases": [],
    "status": "usually-animal-derived",
    "animalIds": [
      "animal-cattle"
    ],
    "useIds": [
      "use-dairy"
    ],
    "commonSources": [
      "Cow milk"
    ],
    "possibleNonAnimalSources": [
      "Precision fermentation"
    ],
    "commonlyFoundIn": [
      "Supplements",
      "Infant nutrition",
      "Functional foods"
    ],
    "purpose": "Iron-binding protein commonly isolated from milk.",
    "alternativeIds": [],
    "verificationAdvice": "Verify source; recombinant or fermentation-derived versions may exist.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-curds",
    "name": "Curds",
    "aliases": [],
    "status": "animal-derived",
    "animalIds": [
      "animal-cattle",
      "animal-goat",
      "animal-sheep"
    ],
    "useIds": [
      "use-dairy"
    ],
    "commonSources": [
      "Coagulated milk"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Cheese",
      "Curd products",
      "Prepared foods"
    ],
    "purpose": "Coagulated milk solids.",
    "alternativeIds": [],
    "verificationAdvice": "Treat unspecified dairy curds as animal-derived.",
    "sourceIds": [
      "source-fda"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-rennet",
    "name": "Rennet",
    "aliases": [
      "rennin"
    ],
    "status": "may-be-animal-derived",
    "animalIds": [
      "animal-cattle",
      "animal-sheep",
      "animal-goat"
    ],
    "useIds": [
      "use-dairy"
    ],
    "commonSources": [
      "Young-ruminant stomach enzymes",
      "Microbial fermentation",
      "Plants"
    ],
    "possibleNonAnimalSources": [
      "Microbial enzymes",
      "Fermentation-produced chymosin",
      "Plant coagulants"
    ],
    "commonlyFoundIn": [
      "Cheese",
      "Cheese flavorings"
    ],
    "purpose": "Milk-clotting enzyme preparation.",
    "alternativeIds": [],
    "verificationAdvice": "Ask whether it is animal rennet, microbial enzyme, fermentation-produced chymosin or plant-derived.",
    "sourceIds": [
      "src-fda-types-food-ingredients",
      "src-fda-food-enzyme-preparations"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-pepsin",
    "name": "Pepsin",
    "aliases": [],
    "status": "animal-derived",
    "animalIds": [
      "animal-pig",
      "animal-cattle"
    ],
    "useIds": [
      "use-pork",
      "use-beef"
    ],
    "commonSources": [
      "Stomach tissue"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Some cheeses",
      "Digestive aids",
      "Food processing"
    ],
    "purpose": "Proteolytic enzyme traditionally obtained from animal stomach tissue.",
    "alternativeIds": [],
    "verificationAdvice": "Verify enzyme source when used in processing.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-lipase",
    "name": "Lipase",
    "aliases": [],
    "status": "may-be-animal-derived",
    "animalIds": [
      "animal-cattle",
      "animal-pig",
      "animal-goat",
      "animal-sheep"
    ],
    "useIds": [
      "use-dairy",
      "use-pork"
    ],
    "commonSources": [
      "Animal tissue",
      "Microbial fermentation",
      "Plants"
    ],
    "possibleNonAnimalSources": [
      "Microbial fermentation",
      "Plant sources"
    ],
    "commonlyFoundIn": [
      "Cheese",
      "Flavor preparations",
      "Baked goods",
      "Supplements"
    ],
    "purpose": "Fat-splitting enzyme.",
    "alternativeIds": [],
    "verificationAdvice": "The word lipase does not identify its biological source; ask the manufacturer.",
    "sourceIds": [
      "src-fda-food-enzyme-preparations",
      "src-fda-microbial-food-ingredients"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-chymosin",
    "name": "Chymosin",
    "aliases": [
      "fermentation-produced chymosin"
    ],
    "status": "may-be-animal-derived",
    "animalIds": [
      "animal-cattle"
    ],
    "useIds": [
      "use-dairy"
    ],
    "commonSources": [
      "Calf stomach",
      "Fermentation-produced enzyme"
    ],
    "possibleNonAnimalSources": [
      "Microbial fermentation"
    ],
    "commonlyFoundIn": [
      "Cheese"
    ],
    "purpose": "Milk-clotting enzyme.",
    "alternativeIds": [],
    "verificationAdvice": "Verify whether the chymosin is animal-derived or fermentation-produced.",
    "sourceIds": [
      "src-fda-types-food-ingredients",
      "src-fda-microbial-food-ingredients"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-fish-gelatin",
    "name": "Fish gelatin",
    "aliases": [],
    "status": "animal-derived",
    "animalIds": [
      "animal-fish"
    ],
    "useIds": [
      "use-fishing-aquaculture",
      "use-gelatin-rendering"
    ],
    "commonSources": [
      "Fish skin and bones"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Capsules",
      "Confectionery",
      "Desserts",
      "Food coatings"
    ],
    "purpose": "Gelling and film-forming animal protein.",
    "alternativeIds": [],
    "verificationAdvice": "Fish gelatin is not vegan even when marketed as an alternative to bovine or porcine gelatin.",
    "sourceIds": [
      "src-usda-gelatin-collagen-byproducts"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-fish-oil",
    "name": "Fish oil",
    "aliases": [],
    "status": "animal-derived",
    "animalIds": [
      "animal-fish"
    ],
    "useIds": [
      "use-fishing-aquaculture"
    ],
    "commonSources": [
      "Fish tissues"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Omega-3 supplements",
      "Fortified foods",
      "Pet foods"
    ],
    "purpose": "Source of marine fats including EPA and DHA.",
    "alternativeIds": [
      "alt-algae-omega3"
    ],
    "verificationAdvice": "Choose an algae-derived product when replacing fish oil.",
    "sourceIds": [
      "src-fda-supplement-ingredient-labeling"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-cod-liver-oil",
    "name": "Cod liver oil",
    "aliases": [],
    "status": "animal-derived",
    "animalIds": [
      "animal-fish"
    ],
    "useIds": [
      "use-fishing-aquaculture"
    ],
    "commonSources": [
      "Cod liver"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Supplements"
    ],
    "purpose": "Fish-liver oil supplying fats and fat-soluble vitamins.",
    "alternativeIds": [
      "alt-algae-omega3"
    ],
    "verificationAdvice": "Cod liver oil is fish-derived.",
    "sourceIds": [
      "src-fda-supplement-ingredient-labeling"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-anchovy",
    "name": "Anchovy",
    "aliases": [
      "anchovies"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-fish"
    ],
    "useIds": [
      "use-fishing-aquaculture"
    ],
    "commonSources": [
      "Anchovy fish"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Worcestershire-style sauce",
      "Caesar dressing",
      "Fish sauce",
      "Flavorings"
    ],
    "purpose": "Fish ingredient used for saltiness and savory flavor.",
    "alternativeIds": [],
    "verificationAdvice": "Read sauce and dressing ingredients carefully.",
    "sourceIds": [
      "source-fda"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-fish-sauce",
    "name": "Fish sauce",
    "aliases": [
      "nam pla",
      "nuoc mam"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-fish"
    ],
    "useIds": [
      "use-fishing-aquaculture"
    ],
    "commonSources": [
      "Fermented fish"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Southeast Asian dishes",
      "Marinades",
      "Sauces"
    ],
    "purpose": "Salty fermented fish condiment.",
    "alternativeIds": [],
    "verificationAdvice": "Use mushroom, seaweed or vegan fish-sauce alternatives.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-oyster-sauce",
    "name": "Oyster sauce",
    "aliases": [
      "oyster extract sauce"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-shellfish"
    ],
    "useIds": [
      "use-fishing-aquaculture"
    ],
    "commonSources": [
      "Oyster extract"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Sauces",
      "Stir-fries",
      "Marinades"
    ],
    "purpose": "Savory sauce traditionally made with oyster extract.",
    "alternativeIds": [],
    "verificationAdvice": "Look specifically for vegetarian or vegan mushroom-based oyster-style sauce.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-chondroitin-sulfate",
    "name": "Chondroitin sulfate",
    "aliases": [
      "chondroitin"
    ],
    "status": "usually-animal-derived",
    "animalIds": [
      "animal-cattle",
      "animal-pig",
      "animal-fish"
    ],
    "useIds": [
      "use-beef",
      "use-pork",
      "use-fishing-aquaculture"
    ],
    "commonSources": [
      "Animal cartilage"
    ],
    "possibleNonAnimalSources": [
      "Microbial fermentation"
    ],
    "commonlyFoundIn": [
      "Joint supplements",
      "Medical products"
    ],
    "purpose": "Structural molecule commonly sourced from animal cartilage.",
    "alternativeIds": [],
    "verificationAdvice": "Look for fermentation-derived or explicitly vegan chondroitin.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-glucosamine",
    "name": "Glucosamine",
    "aliases": [
      "glucosamine sulfate",
      "glucosamine hydrochloride"
    ],
    "status": "may-be-animal-derived",
    "animalIds": [
      "animal-shellfish"
    ],
    "useIds": [
      "use-fishing-aquaculture"
    ],
    "commonSources": [
      "Shellfish shells",
      "Microbial fermentation"
    ],
    "possibleNonAnimalSources": [
      "Microbial fermentation"
    ],
    "commonlyFoundIn": [
      "Joint supplements"
    ],
    "purpose": "Amino sugar used in supplements.",
    "alternativeIds": [],
    "verificationAdvice": "Choose shellfish-free, fermentation-derived glucosamine when required.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-cholesterol",
    "name": "Cholesterol",
    "aliases": [],
    "status": "usually-animal-derived",
    "animalIds": [
      "animal-sheep",
      "animal-cattle"
    ],
    "useIds": [
      "use-wool",
      "use-dairy"
    ],
    "commonSources": [
      "Animal tissues",
      "Lanolin"
    ],
    "possibleNonAnimalSources": [
      "Synthetic production"
    ],
    "commonlyFoundIn": [
      "Cosmetics",
      "Pharmaceuticals",
      "Laboratory media"
    ],
    "purpose": "Animal sterol used as an emollient or technical ingredient.",
    "alternativeIds": [],
    "verificationAdvice": "Verify whether a synthetic or non-animal production route was used.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-elastin",
    "name": "Elastin",
    "aliases": [
      "hydrolyzed elastin"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-cattle",
      "animal-pig",
      "animal-fish"
    ],
    "useIds": [
      "use-beef",
      "use-pork",
      "use-fishing-aquaculture"
    ],
    "commonSources": [
      "Animal connective tissue"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Skin care",
      "Hair care",
      "Supplements"
    ],
    "purpose": "Structural animal protein.",
    "alternativeIds": [],
    "verificationAdvice": "Hydrolyzed elastin remains animal-derived.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-placenta-extract",
    "name": "Placenta extract",
    "aliases": [
      "placental protein",
      "placenta protein"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-sheep",
      "animal-pig",
      "animal-cattle"
    ],
    "useIds": [
      "use-small-ruminant-meat",
      "use-pork",
      "use-beef"
    ],
    "commonSources": [
      "Animal placenta"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Skin care",
      "Hair products",
      "Supplements"
    ],
    "purpose": "Animal-tissue extract.",
    "alternativeIds": [],
    "verificationAdvice": "Species may appear in the ingredient name; otherwise ask the manufacturer.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-snail-mucin",
    "name": "Snail secretion filtrate",
    "aliases": [
      "snail mucin",
      "snail filtrate"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-shellfish"
    ],
    "useIds": [],
    "commonSources": [
      "Snail secretions"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Skin care",
      "Serums",
      "Moisturizers"
    ],
    "purpose": "Filtered secretion collected from snails.",
    "alternativeIds": [],
    "verificationAdvice": "Snail mucin and snail secretion filtrate are animal-derived.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-pearl-powder",
    "name": "Pearl powder",
    "aliases": [
      "hydrolyzed pearl",
      "nacre"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-shellfish"
    ],
    "useIds": [
      "use-fishing-aquaculture"
    ],
    "commonSources": [
      "Mollusk-produced pearls"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Cosmetics",
      "Supplements"
    ],
    "purpose": "Ground pearl material.",
    "alternativeIds": [],
    "verificationAdvice": "Pearl and mother-of-pearl ingredients are animal-produced.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-guanine",
    "name": "Guanine",
    "aliases": [
      "natural pearl essence",
      "CI 75170"
    ],
    "status": "may-be-animal-derived",
    "animalIds": [
      "animal-fish"
    ],
    "useIds": [
      "use-fishing-aquaculture"
    ],
    "commonSources": [
      "Fish scales",
      "Synthetic production"
    ],
    "possibleNonAnimalSources": [
      "Synthetic guanine",
      "Mineral or synthetic effect pigments"
    ],
    "commonlyFoundIn": [
      "Shimmer cosmetics",
      "Nail products"
    ],
    "purpose": "Crystalline material used for pearlescent effects.",
    "alternativeIds": [],
    "verificationAdvice": "Verify whether the guanine is fish-derived or synthetic.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-silk-amino-acids",
    "name": "Silk amino acids",
    "aliases": [
      "hydrolyzed silk",
      "sericin",
      "fibroin"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-silkworm"
    ],
    "useIds": [
      "use-silk"
    ],
    "commonSources": [
      "Silkworm silk"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Hair products",
      "Skin care"
    ],
    "purpose": "Hydrolyzed components of silk protein.",
    "alternativeIds": [],
    "verificationAdvice": "Silk protein, sericin and fibroin are silk-derived.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-milk-protein",
    "name": "Milk protein",
    "aliases": [
      "hydrolyzed milk protein"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-cattle",
      "animal-goat",
      "animal-sheep"
    ],
    "useIds": [
      "use-dairy"
    ],
    "commonSources": [
      "Milk"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Hair care",
      "Skin care",
      "Foods",
      "Supplements"
    ],
    "purpose": "Protein isolated from milk.",
    "alternativeIds": [],
    "verificationAdvice": "Milk protein and hydrolyzed milk protein are dairy-derived.",
    "sourceIds": [
      "source-fda"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-animal-hair",
    "name": "Animal hair and bristles",
    "aliases": [
      "boar bristle",
      "horsehair",
      "goat hair"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-pig",
      "animal-goat",
      "animal-horse-donkey"
    ],
    "useIds": [
      "use-work-transport",
      "use-wool"
    ],
    "commonSources": [
      "Animal hair or bristles"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Brushes",
      "Textiles",
      "Instrument bows"
    ],
    "purpose": "Animal fiber used as a material.",
    "alternativeIds": [],
    "verificationAdvice": "Check brush and textile fiber descriptions.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-feathers-down",
    "name": "Feathers and down",
    "aliases": [
      "down fill",
      "feather fill"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-chicken",
      "animal-turkey",
      "animal-duck-goose"
    ],
    "useIds": [
      "use-feathers-down"
    ],
    "commonSources": [
      "Bird plumage"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Jackets",
      "Pillows",
      "Comforters",
      "Sleeping bags"
    ],
    "purpose": "Insulating and filling material.",
    "alternativeIds": [
      "alt-synthetic-insulation"
    ],
    "verificationAdvice": "Check fill labels, not just exterior fabric.",
    "sourceIds": [
      "src-ftc-apparel-labeling"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-wool",
    "name": "Wool",
    "aliases": [
      "merino",
      "lambswool"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-sheep"
    ],
    "useIds": [
      "use-wool"
    ],
    "commonSources": [
      "Sheep fleece"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Clothing",
      "Blankets",
      "Carpets",
      "Insulation"
    ],
    "purpose": "Animal textile fiber.",
    "alternativeIds": [
      "alt-nonwool-fibers"
    ],
    "verificationAdvice": "Check fiber-content labels.",
    "sourceIds": [
      "src-ftc-apparel-labeling"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-cashmere",
    "name": "Cashmere",
    "aliases": [],
    "status": "animal-derived",
    "animalIds": [
      "animal-goat"
    ],
    "useIds": [
      "use-wool"
    ],
    "commonSources": [
      "Cashmere goat hair"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Sweaters",
      "Scarves",
      "Coats"
    ],
    "purpose": "Fine animal-hair textile fiber.",
    "alternativeIds": [
      "alt-nonwool-fibers"
    ],
    "verificationAdvice": "Cashmere is goat-derived.",
    "sourceIds": [
      "src-ftc-apparel-labeling"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-mohair",
    "name": "Mohair",
    "aliases": [],
    "status": "animal-derived",
    "animalIds": [
      "animal-goat"
    ],
    "useIds": [
      "use-wool"
    ],
    "commonSources": [
      "Angora goat hair"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Clothing",
      "Upholstery",
      "Yarn"
    ],
    "purpose": "Animal-hair textile fiber.",
    "alternativeIds": [
      "alt-nonwool-fibers"
    ],
    "verificationAdvice": "Mohair comes from Angora goats, not Angora rabbits.",
    "sourceIds": [
      "src-ftc-apparel-labeling"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-silk",
    "name": "Silk",
    "aliases": [],
    "status": "animal-derived",
    "animalIds": [
      "animal-silkworm"
    ],
    "useIds": [
      "use-silk"
    ],
    "commonSources": [
      "Silkworm cocoons"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Clothing",
      "Bedding",
      "Thread"
    ],
    "purpose": "Animal-produced protein fiber.",
    "alternativeIds": [
      "alt-nonsilk-fibers"
    ],
    "verificationAdvice": "“Satin” is a weave; confirm the actual fiber content.",
    "sourceIds": [
      "src-fao-silkworm-cocoons"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-leather",
    "name": "Leather",
    "aliases": [],
    "status": "animal-derived",
    "animalIds": [
      "animal-cattle",
      "animal-pig",
      "animal-sheep",
      "animal-goat"
    ],
    "useIds": [
      "use-leather"
    ],
    "commonSources": [
      "Animal hides and skins"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Shoes",
      "Bags",
      "Belts",
      "Furniture",
      "Vehicle interiors"
    ],
    "purpose": "Tanned animal skin.",
    "alternativeIds": [
      "alt-nonleather-materials"
    ],
    "verificationAdvice": "Check lining, trim and small components as well as the main material.",
    "sourceIds": [
      "src-ftc-apparel-labeling"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-suede",
    "name": "Suede",
    "aliases": [],
    "status": "animal-derived",
    "animalIds": [
      "animal-cattle",
      "animal-pig",
      "animal-sheep",
      "animal-goat"
    ],
    "useIds": [
      "use-leather"
    ],
    "commonSources": [
      "Animal skin"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Shoes",
      "Clothing",
      "Bags",
      "Upholstery"
    ],
    "purpose": "Leather with a napped surface.",
    "alternativeIds": [
      "alt-nonleather-materials"
    ],
    "verificationAdvice": "Suede is leather unless explicitly identified as faux or synthetic.",
    "sourceIds": [
      "src-ftc-apparel-labeling"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-fur",
    "name": "Fur",
    "aliases": [],
    "status": "animal-derived",
    "animalIds": [
      "animal-rabbit",
      "animal-mink",
      "animal-fox",
      "animal-raccoon-dog",
      "animal-chinchilla",
      "animal-coyote"
    ],
    "useIds": [
      "use-fur",
      "use-wildlife-hunting-trapping"
    ],
    "commonSources": [
      "Animal pelts"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Coats",
      "Trim",
      "Hats",
      "Accessories"
    ],
    "purpose": "Animal skin with hair attached.",
    "alternativeIds": [
      "alt-nonfur-materials"
    ],
    "verificationAdvice": "U.S. fur labeling generally identifies the animal name.",
    "sourceIds": [
      "src-ftc-apparel-labeling",
      "src-idnr-furbearers"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-bone-char",
    "name": "Bone char",
    "aliases": [
      "natural carbon"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-cattle"
    ],
    "useIds": [
      "use-beef",
      "use-gelatin-rendering"
    ],
    "commonSources": [
      "Carbonized animal bones"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Some sugar refining",
      "Filtration"
    ],
    "purpose": "Processing and filtration medium.",
    "alternativeIds": [],
    "verificationAdvice": "It may be a processing aid rather than a listed ingredient; ask the producer about refining method.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-bone-phosphate",
    "name": "Bone phosphate",
    "aliases": [
      "calcium bone phosphate"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-cattle",
      "animal-pig"
    ],
    "useIds": [
      "use-beef",
      "use-pork"
    ],
    "commonSources": [
      "Processed animal bones"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Ceramics",
      "Supplements",
      "Technical products"
    ],
    "purpose": "Calcium-phosphate material from bone.",
    "alternativeIds": [],
    "verificationAdvice": "Verify source because mineral and synthetic phosphates also exist.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-bone-meal",
    "name": "Bone meal",
    "aliases": [
      "bonemeal"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-cattle",
      "animal-pig"
    ],
    "useIds": [
      "use-beef",
      "use-pork"
    ],
    "commonSources": [
      "Ground animal bones"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Fertilizer",
      "Animal feed",
      "Some supplements"
    ],
    "purpose": "Ground or processed bone material.",
    "alternativeIds": [],
    "verificationAdvice": "Bone meal is animal-derived.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-blood-plasma",
    "name": "Blood plasma",
    "aliases": [
      "plasma protein",
      "bovine plasma",
      "porcine plasma"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-cattle",
      "animal-pig"
    ],
    "useIds": [
      "use-beef",
      "use-pork"
    ],
    "commonSources": [
      "Animal blood"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Processed meat",
      "Animal feed",
      "Technical products"
    ],
    "purpose": "Separated blood component used for binding or protein functionality.",
    "alternativeIds": [],
    "verificationAdvice": "Species may be declared as bovine or porcine plasma.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-hemoglobin",
    "name": "Hemoglobin",
    "aliases": [
      "haemoglobin"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-cattle",
      "animal-pig"
    ],
    "useIds": [
      "use-beef",
      "use-pork"
    ],
    "commonSources": [
      "Animal blood"
    ],
    "possibleNonAnimalSources": [
      "Recombinant production"
    ],
    "commonlyFoundIn": [
      "Supplements",
      "Color or protein preparations",
      "Laboratory products"
    ],
    "purpose": "Oxygen-carrying blood protein.",
    "alternativeIds": [],
    "verificationAdvice": "Verify source; recombinant laboratory products may differ.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-confectioners-glaze",
    "name": "Confectioner’s glaze",
    "aliases": [
      "confectioners glaze",
      "pharmaceutical glaze",
      "resinous glaze"
    ],
    "status": "animal-derived",
    "animalIds": [
      "animal-silkworm"
    ],
    "useIds": [],
    "commonSources": [
      "Shellac insect secretion"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Candy",
      "Pills",
      "Fruit coatings",
      "Decorations"
    ],
    "purpose": "Glossy shellac-based coating.",
    "alternativeIds": [
      "alt-plant-waxes"
    ],
    "verificationAdvice": "Also look for shellac, pharmaceutical glaze or resinous glaze.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-oleic-acid",
    "name": "Oleic acid",
    "aliases": [],
    "status": "may-be-animal-derived",
    "animalIds": [
      "animal-cattle",
      "animal-pig"
    ],
    "useIds": [
      "use-gelatin-rendering"
    ],
    "commonSources": [
      "Plant oils",
      "Animal fats"
    ],
    "possibleNonAnimalSources": [
      "Olive and other plant oils"
    ],
    "commonlyFoundIn": [
      "Cosmetics",
      "Soaps",
      "Foods",
      "Industrial products"
    ],
    "purpose": "Fatty acid used as an emollient, surfactant or processing ingredient.",
    "alternativeIds": [],
    "verificationAdvice": "The name does not identify source; ask the manufacturer.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-palmitic-acid",
    "name": "Palmitic acid",
    "aliases": [],
    "status": "may-be-animal-derived",
    "animalIds": [
      "animal-cattle",
      "animal-pig"
    ],
    "useIds": [
      "use-gelatin-rendering"
    ],
    "commonSources": [
      "Palm oil",
      "Other plant oils",
      "Animal fats"
    ],
    "possibleNonAnimalSources": [
      "Palm or other plant oils"
    ],
    "commonlyFoundIn": [
      "Cosmetics",
      "Soaps",
      "Foods"
    ],
    "purpose": "Fatty acid used in formulations.",
    "alternativeIds": [],
    "verificationAdvice": "Verify whether it comes from plant oil, animal fat or another process.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-cetyl-alcohol",
    "name": "Cetyl alcohol",
    "aliases": [],
    "status": "may-be-animal-derived",
    "animalIds": [
      "animal-cattle",
      "animal-pig"
    ],
    "useIds": [
      "use-gelatin-rendering"
    ],
    "commonSources": [
      "Plant oils",
      "Animal fats",
      "Synthetic production"
    ],
    "possibleNonAnimalSources": [
      "Plant-derived or synthetic cetyl alcohol"
    ],
    "commonlyFoundIn": [
      "Conditioner",
      "Lotion",
      "Cosmetics"
    ],
    "purpose": "Fatty alcohol used as a thickener and emollient.",
    "alternativeIds": [],
    "verificationAdvice": "Fatty alcohol does not mean drinking alcohol; verify feedstock source.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-caprylic-acid",
    "name": "Caprylic acid",
    "aliases": [
      "octanoic acid"
    ],
    "status": "may-be-animal-derived",
    "animalIds": [
      "animal-cattle",
      "animal-goat"
    ],
    "useIds": [
      "use-dairy"
    ],
    "commonSources": [
      "Coconut oil",
      "Palm-kernel oil",
      "Milk fat"
    ],
    "possibleNonAnimalSources": [
      "Coconut or palm-kernel oil"
    ],
    "commonlyFoundIn": [
      "Supplements",
      "Cosmetics",
      "Foods"
    ],
    "purpose": "Medium-chain fatty acid.",
    "alternativeIds": [],
    "verificationAdvice": "Commercial source may be plant oil or dairy fat; verify when unspecified.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-lecithin",
    "name": "Lecithin",
    "aliases": [],
    "status": "may-be-animal-derived",
    "animalIds": [
      "animal-chicken"
    ],
    "useIds": [
      "use-eggs"
    ],
    "commonSources": [
      "Soy",
      "Sunflower",
      "Egg yolk",
      "Other sources"
    ],
    "possibleNonAnimalSources": [
      "Soy lecithin",
      "Sunflower lecithin"
    ],
    "commonlyFoundIn": [
      "Chocolate",
      "Baked goods",
      "Supplements",
      "Cosmetics"
    ],
    "purpose": "Emulsifier and phospholipid mixture.",
    "alternativeIds": [],
    "verificationAdvice": "Labels often specify soy or sunflower; unspecified lecithin may require verification.",
    "sourceIds": [
      "src-fda-types-food-ingredients"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-biotin",
    "name": "Biotin",
    "aliases": [
      "vitamin B7",
      "vitamin H"
    ],
    "status": "may-be-animal-derived",
    "animalIds": [],
    "useIds": [],
    "commonSources": [
      "Synthetic production",
      "Microbial production",
      "Animal or plant materials"
    ],
    "possibleNonAnimalSources": [
      "Synthetic or microbial production"
    ],
    "commonlyFoundIn": [
      "Supplements",
      "Hair products",
      "Fortified foods"
    ],
    "purpose": "Vitamin B7.",
    "alternativeIds": [],
    "verificationAdvice": "The molecule itself does not reveal the manufacturing source; choose an explicitly vegan product.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-hyaluronic-acid",
    "name": "Hyaluronic acid",
    "aliases": [
      "sodium hyaluronate",
      "hyaluronan"
    ],
    "status": "may-be-animal-derived",
    "animalIds": [
      "animal-chicken"
    ],
    "useIds": [
      "use-poultry"
    ],
    "commonSources": [
      "Microbial fermentation",
      "Rooster comb tissue"
    ],
    "possibleNonAnimalSources": [
      "Microbial fermentation"
    ],
    "commonlyFoundIn": [
      "Skin care",
      "Supplements",
      "Medical products"
    ],
    "purpose": "Moisture-binding polysaccharide.",
    "alternativeIds": [],
    "verificationAdvice": "Look for fermentation-derived or explicitly vegan hyaluronic acid.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-squalane",
    "name": "Squalane",
    "aliases": [],
    "status": "may-be-animal-derived",
    "animalIds": [
      "animal-fish"
    ],
    "useIds": [
      "use-fishing-aquaculture"
    ],
    "commonSources": [
      "Olive, sugarcane or other plants",
      "Shark-liver squalene",
      "Biotechnology"
    ],
    "possibleNonAnimalSources": [
      "Sugarcane-derived squalane",
      "Olive-derived squalane",
      "Fermentation"
    ],
    "commonlyFoundIn": [
      "Skin care",
      "Cosmetics"
    ],
    "purpose": "Hydrogenated form of squalene used as an emollient.",
    "alternativeIds": [],
    "verificationAdvice": "Choose a product that identifies plant-derived or fermentation-derived squalane.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-retinol",
    "name": "Retinol",
    "aliases": [
      "vitamin A1"
    ],
    "status": "may-be-animal-derived",
    "animalIds": [],
    "useIds": [],
    "commonSources": [
      "Synthetic production",
      "Animal-derived vitamin A sources"
    ],
    "possibleNonAnimalSources": [
      "Synthetic production",
      "Plant-derived carotenoid alternatives"
    ],
    "commonlyFoundIn": [
      "Skin care",
      "Supplements",
      "Fortified foods"
    ],
    "purpose": "Vitamin A form used in cosmetics and nutrition products.",
    "alternativeIds": [],
    "verificationAdvice": "Verify the production source and other formulation ingredients.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-disodium-inosinate",
    "name": "Disodium inosinate",
    "aliases": [
      "E631",
      "IMP"
    ],
    "status": "may-be-animal-derived",
    "animalIds": [
      "animal-fish",
      "animal-pig"
    ],
    "useIds": [
      "use-fishing-aquaculture",
      "use-pork"
    ],
    "commonSources": [
      "Meat or fish",
      "Microbial fermentation"
    ],
    "possibleNonAnimalSources": [
      "Microbial fermentation"
    ],
    "commonlyFoundIn": [
      "Instant noodles",
      "Chips",
      "Seasonings",
      "Soups"
    ],
    "purpose": "Flavor enhancer.",
    "alternativeIds": [],
    "verificationAdvice": "Ask whether it is fermentation-derived or sourced from meat or fish.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-disodium-guanylate",
    "name": "Disodium guanylate",
    "aliases": [
      "E627",
      "GMP"
    ],
    "status": "may-be-animal-derived",
    "animalIds": [
      "animal-fish"
    ],
    "useIds": [
      "use-fishing-aquaculture"
    ],
    "commonSources": [
      "Fish",
      "Yeast or microbial fermentation"
    ],
    "possibleNonAnimalSources": [
      "Yeast or microbial fermentation"
    ],
    "commonlyFoundIn": [
      "Seasonings",
      "Snacks",
      "Soups"
    ],
    "purpose": "Flavor enhancer often paired with disodium inosinate.",
    "alternativeIds": [],
    "verificationAdvice": "Verify whether it is fermentation-derived.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-urea",
    "name": "Urea",
    "aliases": [
      "carbamide"
    ],
    "status": "usually-plant-or-microbial",
    "animalIds": [],
    "useIds": [],
    "commonSources": [
      "Synthetic production"
    ],
    "possibleNonAnimalSources": [
      "Synthetic production"
    ],
    "commonlyFoundIn": [
      "Skin creams",
      "Hair products",
      "Medical products"
    ],
    "purpose": "Humectant and keratolytic ingredient generally manufactured synthetically.",
    "alternativeIds": [],
    "verificationAdvice": "Do not classify the name alone as urine-derived; verify only if sourcing is unclear.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-allantoin",
    "name": "Allantoin",
    "aliases": [],
    "status": "usually-plant-or-microbial",
    "animalIds": [],
    "useIds": [],
    "commonSources": [
      "Synthetic production",
      "Plant sources"
    ],
    "possibleNonAnimalSources": [
      "Synthetic production",
      "Plant sources"
    ],
    "commonlyFoundIn": [
      "Skin care",
      "Cosmetics",
      "Topical products"
    ],
    "purpose": "Skin-conditioning ingredient commonly produced synthetically.",
    "alternativeIds": [],
    "verificationAdvice": "Do not assume animal origin from historical sourcing; check current manufacturer information.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-papain",
    "name": "Papain",
    "aliases": [],
    "status": "vegan",
    "animalIds": [],
    "useIds": [],
    "commonSources": [
      "Papaya latex"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Meat tenderizers",
      "Enzyme products",
      "Cosmetics"
    ],
    "purpose": "Plant protease from papaya.",
    "alternativeIds": [],
    "verificationAdvice": "Papain itself is plant-derived, but the full product may contain other ingredients.",
    "sourceIds": [
      "src-fda-food-enzyme-preparations"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-pectin",
    "name": "Pectin",
    "aliases": [],
    "status": "vegan",
    "animalIds": [],
    "useIds": [],
    "commonSources": [
      "Fruit cell walls",
      "Citrus peel",
      "Apple pomace"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Jam",
      "Jelly",
      "Candy",
      "Desserts"
    ],
    "purpose": "Plant-derived gelling and thickening agent.",
    "alternativeIds": [
      "alt-plant-gelling"
    ],
    "verificationAdvice": "Pectin is a common gelatin alternative.",
    "sourceIds": [
      "src-fda-types-food-ingredients"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-agar",
    "name": "Agar",
    "aliases": [
      "agar-agar"
    ],
    "status": "vegan",
    "animalIds": [],
    "useIds": [],
    "commonSources": [
      "Red algae"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Desserts",
      "Microbiology media",
      "Gels"
    ],
    "purpose": "Algae-derived gelling agent.",
    "alternativeIds": [
      "alt-plant-gelling"
    ],
    "verificationAdvice": "Agar sets more firmly than gelatin and is not always a one-to-one substitute.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-carrageenan",
    "name": "Carrageenan",
    "aliases": [],
    "status": "vegan",
    "animalIds": [],
    "useIds": [],
    "commonSources": [
      "Red seaweed"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Plant milks",
      "Desserts",
      "Processed foods",
      "Cosmetics"
    ],
    "purpose": "Seaweed-derived thickener and stabilizer.",
    "alternativeIds": [
      "alt-plant-gelling"
    ],
    "verificationAdvice": "Carrageenan is not animal-derived.",
    "sourceIds": [
      "src-fda-types-food-ingredients"
    ],
    "needsResearch": false
  },
  {
    "id": "ingredient-plant-waxes",
    "name": "Candelilla and carnauba wax",
    "aliases": [
      "candelilla wax",
      "carnauba wax"
    ],
    "status": "vegan",
    "animalIds": [],
    "useIds": [],
    "commonSources": [
      "Candelilla shrub",
      "Carnauba palm"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Candy coatings",
      "Cosmetics",
      "Polishes",
      "Candles"
    ],
    "purpose": "Plant waxes used for coating, structure and gloss.",
    "alternativeIds": [
      "alt-plant-waxes"
    ],
    "verificationAdvice": "Check complete formulations because a product may blend several waxes.",
    "sourceIds": [],
    "needsResearch": true
  },
  {
    "id": "ingredient-cellulose-capsule",
    "name": "Cellulose capsule",
    "aliases": [
      "HPMC",
      "hypromellose",
      "vegetable capsule",
      "pullulan capsule"
    ],
    "status": "vegan",
    "animalIds": [],
    "useIds": [],
    "commonSources": [
      "Plant cellulose"
    ],
    "possibleNonAnimalSources": [],
    "commonlyFoundIn": [
      "Supplements",
      "Medicines"
    ],
    "purpose": "Plant-derived capsule shell material.",
    "alternativeIds": [],
    "verificationAdvice": "Look for HPMC, hypromellose or pullulan; verify the contents separately.",
    "sourceIds": [],
    "needsResearch": true
  }
].forEach(addIngredient);

  // ---- Products ----
  const products = [];
  
  function addProduct(p) {
    const slug = value => String(value || '')
      .toLowerCase()
      .trim()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  
    products.push({
      id: p.id || `product-${slug(p.brand)}-${slug(p.name)}`,
      name: p.name || '',
      brand: p.brand || '',
      category: p.category || 'Other',
      replaces: p.replaces || '',
      description: p.description || 'A plant-based alternative.',
      base: p.base || 'Plant-based',
      uses: p.uses || 'Check the package for preparation instructions.',
      priceTier: p.priceTier || 'moderate',
      dietaryTags: Array.isArray(p.dietaryTags) ? p.dietaryTags : [],
      companyScope: p.companyScope || 'unknown',
      productStatus: p.productStatus || 'verify-current-packaging',
      featured: Boolean(p.featured),
      emoji: p.emoji || '🌱',
      lastVerified: p.lastVerified || null,
      verificationNote: p.verificationNote ||
        'Ingredients, allergens, certifications, availability, and manufacturing practices can change. Verify the current package and manufacturer information before purchasing.',
      region: p.region || 'United States',
      availability: p.availability || 'Availability varies by retailer and location.',
      productUrl: p.productUrl || '',
      ingredientsSummary: p.ingredientsSummary || '',
      verificationScope: p.verificationScope || 'unverified',
      sourceIds: Array.isArray(p.sourceIds) ? p.sourceIds : [],
      alternativeIds: Array.isArray(p.alternativeIds) ? p.alternativeIds : [],
      needsResearch: p.needsResearch ?? true
    });
  }
  
  const commercialProducts = [
    // ==========================================================
    // BURGERS, GROUND MEAT, MEATBALLS AND STEAK
    // ==========================================================
    {
      name: 'Impossible Beef Made From Plants',
      brand: 'Impossible Foods',
      category: 'Ground Meat',
      replaces: 'Ground beef',
      description: 'Plant-based ground meat for burgers, tacos, meatballs, chili and other recipes.',
      base: 'Soy protein',
      uses: 'Shape into patties or cook as ground meat.',
      priceTier: 'premium',
      dietaryTags: ['high-protein'],
      featured: true,
      emoji: '🥩'
    },
    {
      name: 'Impossible Burger Patties',
      brand: 'Impossible Foods',
      category: 'Burger',
      replaces: 'Beef hamburger patties',
      description: 'Preformed plant-based burger patties designed for grilling or pan cooking.',
      base: 'Soy protein',
      uses: 'Grill, pan-fry or cook according to package directions.',
      priceTier: 'premium',
      dietaryTags: ['high-protein'],
      featured: true,
      emoji: '🍔'
    },
    {
      name: 'Beyond Burger',
      brand: 'Beyond Meat',
      category: 'Burger',
      replaces: 'Beef hamburger patties',
      description: 'Plant-based burger patties with a meat-like texture.',
      base: 'Plant protein',
      uses: 'Grill or pan-cook according to package directions.',
      priceTier: 'premium',
      dietaryTags: ['high-protein'],
      featured: true,
      emoji: '🍔'
    },
    {
      name: 'Beyond Beef',
      brand: 'Beyond Meat',
      category: 'Ground Meat',
      replaces: 'Ground beef',
      description: 'Plant-based ground meat for tacos, pasta, chili, casseroles and burgers.',
      base: 'Plant protein',
      uses: 'Cook anywhere ground beef would normally be used.',
      priceTier: 'premium',
      dietaryTags: ['high-protein'],
      emoji: '🥩'
    },
    {
      name: 'Beyond Meatballs',
      brand: 'Beyond Meat',
      category: 'Meatballs',
      replaces: 'Beef or pork meatballs',
      description: 'Preformed plant-based meatballs for pasta, subs and appetizers.',
      base: 'Plant protein',
      uses: 'Cook and serve with pasta, sauce or sandwiches.',
      priceTier: 'premium',
      dietaryTags: ['high-protein'],
      emoji: '🍝'
    },
    {
      name: 'Ultimate Plant-Based Burger',
      brand: 'Gardein',
      category: 'Burger',
      replaces: 'Beef hamburger patties',
      description: 'Plant-based burger patties suitable for grilling or pan cooking.',
      base: 'Plant protein',
      uses: 'Serve on a bun or use as a plated protein.',
      priceTier: 'moderate',
      emoji: '🍔'
    },
    {
      name: 'All American Veggie Burgers',
      brand: 'Dr. Praeger’s',
      category: 'Burger',
      replaces: 'Hamburger patties',
      description: 'Vegetable-based burger patties with a familiar savory flavor.',
      base: 'Vegetables and plant protein',
      uses: 'Cook from frozen and serve on a bun or grain bowl.',
      priceTier: 'moderate',
      emoji: '🍔'
    },
    {
      name: 'Original Vegan Veggie Burgers',
      brand: 'Boca',
      category: 'Burger',
      replaces: 'Hamburger patties',
      description: 'Classic soy-based frozen veggie burger patties.',
      base: 'Soy protein',
      uses: 'Microwave, grill or pan-cook according to package directions.',
      priceTier: 'budget',
      verificationNote: 'Boca sells multiple products with different formulations. Confirm that the exact package is labeled vegan.',
      emoji: '🍔'
    },
    {
      name: 'Plant-Based Ground',
      brand: 'Gardein',
      category: 'Ground Meat',
      replaces: 'Ground beef',
      description: 'Plant-based crumbles for tacos, chili, pasta and casseroles.',
      base: 'Plant protein',
      uses: 'Cook into sauces, tacos, chili and skillet meals.',
      priceTier: 'moderate',
      emoji: '🥩'
    },
    {
      name: 'Plant-Based Steak',
      brand: 'Meati',
      category: 'Steak',
      replaces: 'Beef steak',
      description: 'Whole-cut style plant-based steak alternative.',
      base: 'Mushroom root',
      uses: 'Pan-sear and serve as a main protein.',
      priceTier: 'premium',
      dietaryTags: ['high-protein'],
      emoji: '🥩'
    },
  
    // ==========================================================
    // CHICKEN AND TURKEY ALTERNATIVES
    // ==========================================================
    {
      name: 'Impossible Chicken Nuggets Made From Plants',
      brand: 'Impossible Foods',
      category: 'Chicken',
      replaces: 'Chicken nuggets',
      description: 'Breaded plant-based nuggets for meals, snacks and dipping.',
      base: 'Plant protein',
      uses: 'Bake or air-fry according to package directions.',
      priceTier: 'moderate',
      dietaryTags: ['high-protein'],
      featured: true,
      emoji: '🍗'
    },
    {
      name: 'Beyond Chicken Tenders',
      brand: 'Beyond Meat',
      category: 'Chicken',
      replaces: 'Breaded chicken tenders',
      description: 'Breaded plant-based tenders with a meat-like center.',
      base: 'Plant protein',
      uses: 'Bake or air-fry and serve with dipping sauce.',
      priceTier: 'premium',
      dietaryTags: ['high-protein'],
      emoji: '🍗'
    },
    {
      name: 'Ultimate Plant-Based Chick’n Tenders',
      brand: 'Gardein',
      category: 'Chicken',
      replaces: 'Chicken tenders',
      description: 'Breaded plant-based tenders for wraps, salads and entrées.',
      base: 'Plant protein',
      uses: 'Bake or air-fry according to package directions.',
      priceTier: 'moderate',
      emoji: '🍗'
    },
    {
      name: 'Seven Grain Crispy Tenders',
      brand: 'Gardein',
      category: 'Chicken',
      replaces: 'Breaded chicken tenders',
      description: 'Breaded plant-based tenders with a multigrain coating.',
      base: 'Soy and wheat protein',
      uses: 'Serve in wraps, salads, bowls or with dipping sauce.',
      priceTier: 'moderate',
      emoji: '🍗'
    },
    {
      name: 'Chick’n Scallopini',
      brand: 'Gardein',
      category: 'Chicken',
      replaces: 'Chicken breast or cutlets',
      description: 'Unbreaded plant-based cutlets for skillet meals and entrées.',
      base: 'Soy and wheat protein',
      uses: 'Pan-cook and add to pasta, vegetables or sauces.',
      priceTier: 'moderate',
      dietaryTags: ['high-protein'],
      emoji: '🍗'
    },
    {
      name: 'Mandarin Orange Crispy Chick’n',
      brand: 'Gardein',
      category: 'Prepared Meal',
      replaces: 'Orange chicken',
      description: 'Breaded plant-based pieces with mandarin orange sauce.',
      base: 'Soy and wheat protein',
      uses: 'Serve with rice, noodles or vegetables.',
      priceTier: 'moderate',
      emoji: '🥡'
    },
    {
      name: 'Plant-Based Chick’n Nuggets',
      brand: 'MorningStar Farms',
      category: 'Chicken',
      replaces: 'Chicken nuggets',
      description: 'Frozen breaded plant-based nuggets.',
      base: 'Plant protein',
      uses: 'Bake or air-fry and serve with dipping sauce.',
      priceTier: 'budget',
      verificationNote: 'MorningStar Farms has sold both vegan and vegetarian products. Confirm that the exact current package is explicitly labeled vegan.',
      emoji: '🍗'
    },
    {
      name: 'Original Chick’n Tenders',
      brand: 'Daring',
      category: 'Chicken',
      replaces: 'Chicken strips',
      description: 'Unbreaded plant-based chicken-style pieces for cooking.',
      base: 'Soy protein',
      uses: 'Use in stir-fries, salads, wraps, pasta and bowls.',
      priceTier: 'premium',
      dietaryTags: ['high-protein'],
      emoji: '🍗'
    },
    {
      name: 'Plant-Based Chick’n Pieces',
      brand: 'Abbot’s',
      category: 'Chicken',
      replaces: 'Chicken pieces',
      description: 'Plant-based chicken-style pieces for tacos, salads and bowls.',
      base: 'Pea protein',
      uses: 'Season and cook in skillet meals, tacos or wraps.',
      priceTier: 'premium',
      emoji: '🍗'
    },
    {
      name: 'Hickory Smoked Plant-Based Deli Slices',
      brand: 'Tofurky',
      category: 'Deli Meat',
      replaces: 'Turkey deli slices',
      description: 'Smoky plant-based sandwich slices.',
      base: 'Wheat and soy protein',
      uses: 'Use in sandwiches, wraps and snack trays.',
      priceTier: 'moderate',
      dietaryTags: ['high-protein'],
      emoji: '🥪'
    },
    {
      name: 'Oven Roasted Plant-Based Deli Slices',
      brand: 'Tofurky',
      category: 'Deli Meat',
      replaces: 'Turkey deli slices',
      description: 'Plant-based deli slices with an oven-roasted style flavor.',
      base: 'Wheat and soy protein',
      uses: 'Use in sandwiches, wraps and salads.',
      priceTier: 'moderate',
      dietaryTags: ['high-protein'],
      emoji: '🥪'
    },
  
    // ==========================================================
    // SAUSAGE, HOT DOGS, BACON AND BREAKFAST MEAT
    // ==========================================================
    {
      name: 'Beyond Sausage Hot Italian',
      brand: 'Beyond Meat',
      category: 'Sausage',
      replaces: 'Italian pork sausage',
      description: 'Plant-based sausage links with hot Italian seasoning.',
      base: 'Plant protein',
      uses: 'Grill or pan-cook for pasta, sandwiches and skillet meals.',
      priceTier: 'premium',
      dietaryTags: ['high-protein'],
      emoji: '🌭'
    },
    {
      name: 'Beyond Sausage Brat Original',
      brand: 'Beyond Meat',
      category: 'Sausage',
      replaces: 'Pork bratwurst',
      description: 'Plant-based brat-style sausage links.',
      base: 'Plant protein',
      uses: 'Grill or pan-cook and serve in buns or with vegetables.',
      priceTier: 'premium',
      dietaryTags: ['high-protein'],
      emoji: '🌭'
    },
    {
      name: 'Italian Garlic & Fennel Plant-Based Sausage',
      brand: 'Field Roast',
      category: 'Sausage',
      replaces: 'Italian sausage',
      description: 'Seasoned plant-based sausage with garlic and fennel.',
      base: 'Wheat protein',
      uses: 'Slice into pasta, pizza, sandwiches and skillet meals.',
      priceTier: 'moderate',
      dietaryTags: ['high-protein'],
      emoji: '🌭'
    },
    {
      name: 'Smoked Apple & Sage Plant-Based Sausage',
      brand: 'Field Roast',
      category: 'Sausage',
      replaces: 'Pork sausage',
      description: 'Savory plant-based sausage with apple and sage flavors.',
      base: 'Wheat protein',
      uses: 'Serve at breakfast or add to stuffing and skillet meals.',
      priceTier: 'moderate',
      dietaryTags: ['high-protein'],
      emoji: '🌭'
    },
    {
      name: 'Smart Dogs',
      brand: 'Lightlife',
      category: 'Hot Dogs',
      replaces: 'Beef or pork hot dogs',
      description: 'Plant-based hot dog alternative.',
      base: 'Soy and pea protein',
      uses: 'Heat and serve in buns or slice into recipes.',
      priceTier: 'budget',
      emoji: '🌭'
    },
    {
      name: 'Frankfurters',
      brand: 'Field Roast',
      category: 'Hot Dogs',
      replaces: 'Beef or pork hot dogs',
      description: 'Plant-based frankfurter-style sausages.',
      base: 'Wheat protein',
      uses: 'Grill or pan-cook and serve in a bun.',
      priceTier: 'moderate',
      dietaryTags: ['high-protein'],
      emoji: '🌭'
    },
    {
      name: 'Smart Bacon',
      brand: 'Lightlife',
      category: 'Bacon',
      replaces: 'Pork bacon',
      description: 'Plant-based bacon-style strips.',
      base: 'Soy and wheat protein',
      uses: 'Pan-cook for breakfast, sandwiches and toppings.',
      priceTier: 'moderate',
      emoji: '🥓'
    },
    {
      name: 'Smoky Tempeh Strips',
      brand: 'Lightlife',
      category: 'Bacon',
      replaces: 'Pork bacon',
      description: 'Smoky marinated tempeh strips for breakfast and sandwiches.',
      base: 'Soy tempeh',
      uses: 'Pan-cook for breakfast plates, wraps and BLT-style sandwiches.',
      priceTier: 'moderate',
      dietaryTags: ['high-protein'],
      emoji: '🥓'
    },
    {
      name: 'Plant-Based Breakfast Sausage Patties',
      brand: 'Impossible Foods',
      category: 'Breakfast Meat',
      replaces: 'Pork breakfast sausage',
      description: 'Plant-based breakfast sausage patties.',
      base: 'Soy protein',
      uses: 'Cook for breakfast sandwiches, biscuits and breakfast plates.',
      priceTier: 'premium',
      dietaryTags: ['high-protein'],
      emoji: '🥞'
    },
    {
      name: 'Original Breakfast Sausage Patties',
      brand: 'Beyond Meat',
      category: 'Breakfast Meat',
      replaces: 'Pork breakfast sausage',
      description: 'Plant-based breakfast sausage patties.',
      base: 'Plant protein',
      uses: 'Cook for breakfast sandwiches or breakfast plates.',
      priceTier: 'premium',
      dietaryTags: ['high-protein'],
      emoji: '🥞'
    },
  
    // ==========================================================
    // FISH AND SEAFOOD ALTERNATIVES
    // ==========================================================
    {
      name: 'F’sh Filets',
      brand: 'Gardein',
      category: 'Seafood',
      replaces: 'Breaded fish fillets',
      description: 'Breaded plant-based fish-style fillets.',
      base: 'Plant protein',
      uses: 'Use in sandwiches, tacos or fish-and-chips-style meals.',
      priceTier: 'moderate',
      emoji: '🐟'
    },
    {
      name: 'Crabless Cakes',
      brand: 'Gardein',
      category: 'Seafood',
      replaces: 'Crab cakes',
      description: 'Plant-based crab-cake-style patties.',
      base: 'Plant protein',
      uses: 'Serve as an appetizer, sandwich filling or plated entrée.',
      priceTier: 'moderate',
      emoji: '🦀'
    },
    {
      name: 'Plant-Based Breaded Shrimp',
      brand: 'Good Catch',
      category: 'Seafood',
      replaces: 'Breaded shrimp',
      description: 'Breaded plant-based shrimp-style pieces.',
      base: 'Plant protein',
      uses: 'Bake or air-fry for appetizers, tacos and bowls.',
      priceTier: 'premium',
      emoji: '🍤'
    },
    {
      name: 'Plant-Based Fish Sticks',
      brand: 'Good Catch',
      category: 'Seafood',
      replaces: 'Fish sticks',
      description: 'Breaded plant-based fish-style sticks.',
      base: 'Plant protein',
      uses: 'Bake or air-fry and serve with dipping sauce.',
      priceTier: 'premium',
      emoji: '🐟'
    },
    {
      name: 'Plant-Based Tuna',
      brand: 'Good Catch',
      category: 'Seafood',
      replaces: 'Canned tuna',
      description: 'Shelf-stable plant-based tuna-style food for sandwiches and salads.',
      base: 'Legume protein blend',
      uses: 'Use in sandwiches, salads, wraps and casseroles.',
      priceTier: 'premium',
      dietaryTags: ['high-protein'],
      emoji: '🐟'
    },
  
    // ==========================================================
    // MILK
    // ==========================================================
    {
      name: 'Original Soymilk',
      brand: 'Silk',
      category: 'Milk',
      replaces: 'Dairy milk',
      description: 'Soy-based milk alternative for drinking, cereal and cooking.',
      base: 'Soybeans',
      uses: 'Drink cold or use in cereal, smoothies, baking and sauces.',
      priceTier: 'budget',
      dietaryTags: ['high-protein'],
      featured: true,
      emoji: '🥛'
    },
    {
      name: 'Unsweet Soymilk',
      brand: 'Silk',
      category: 'Milk',
      replaces: 'Dairy milk',
      description: 'Unsweetened soy milk for drinking and savory cooking.',
      base: 'Soybeans',
      uses: 'Use in cereal, smoothies, baking and savory recipes.',
      priceTier: 'budget',
      dietaryTags: ['high-protein'],
      emoji: '🥛'
    },
    {
      name: 'Original Oatmilk',
      brand: 'Oatly',
      category: 'Milk',
      replaces: 'Dairy milk',
      description: 'Oat-based milk alternative with a creamy texture.',
      base: 'Oats',
      uses: 'Drink cold or use in cereal, coffee, smoothies and baking.',
      priceTier: 'moderate',
      featured: true,
      emoji: '🥛'
    },
    {
      name: 'Barista Edition Oatmilk',
      brand: 'Oatly',
      category: 'Milk',
      replaces: 'Dairy barista milk',
      description: 'Oat milk formulated for coffee drinks and steaming.',
      base: 'Oats',
      uses: 'Use in coffee, lattes and other hot or iced drinks.',
      priceTier: 'premium',
      emoji: '☕'
    },
    {
      name: 'Original Oatmilk',
      brand: 'Planet Oat',
      category: 'Milk',
      replaces: 'Dairy milk',
      description: 'Oat-based milk alternative for everyday use.',
      base: 'Oats',
      uses: 'Use for drinking, cereal, smoothies and baking.',
      priceTier: 'budget',
      emoji: '🥛'
    },
    {
      name: 'Unsweetened Almondmilk',
      brand: 'Almond Breeze',
      category: 'Milk',
      replaces: 'Dairy milk',
      description: 'Unsweetened almond-based milk alternative.',
      base: 'Almonds',
      uses: 'Use for drinking, cereal, smoothies and baking.',
      priceTier: 'budget',
      emoji: '🥛'
    },
    {
      name: 'Unsweetened Almondmilk',
      brand: 'Califia Farms',
      category: 'Milk',
      replaces: 'Dairy milk',
      description: 'Unsweetened almond milk for beverages and recipes.',
      base: 'Almonds',
      uses: 'Use in coffee, cereal, smoothies and baking.',
      priceTier: 'moderate',
      emoji: '🥛'
    },
    {
      name: 'Ripple Original Plant-Based Milk',
      brand: 'Ripple',
      category: 'Milk',
      replaces: 'Dairy milk',
      description: 'Pea-protein milk alternative.',
      base: 'Pea protein',
      uses: 'Drink cold or use in cereal, smoothies and recipes.',
      priceTier: 'moderate',
      dietaryTags: ['high-protein'],
      emoji: '🥛'
    },
    {
      name: 'Unsweetened Coconutmilk',
      brand: 'So Delicious',
      category: 'Milk',
      replaces: 'Dairy milk',
      description: 'Coconut-based refrigerated milk alternative.',
      base: 'Coconut',
      uses: 'Use for drinking, cereal, smoothies and baking.',
      priceTier: 'moderate',
      emoji: '🥥'
    },
    {
      name: 'Flaxmilk',
      brand: 'Good Karma',
      category: 'Milk',
      replaces: 'Dairy milk',
      description: 'Flax-based milk alternative.',
      base: 'Flaxseed oil',
      uses: 'Use for drinking, cereal, smoothies and baking.',
      priceTier: 'moderate',
      emoji: '🥛'
    },
  
    // ==========================================================
    // CREAMERS
    // ==========================================================
    {
      name: 'Oat Creamer',
      brand: 'Oatly',
      category: 'Creamer',
      replaces: 'Dairy coffee creamer',
      description: 'Oat-based creamer for hot and iced coffee.',
      base: 'Oats',
      uses: 'Add to coffee, tea and other drinks.',
      priceTier: 'moderate',
      emoji: '☕'
    },
    {
      name: 'Oat Barista Blend',
      brand: 'Califia Farms',
      category: 'Creamer',
      replaces: 'Dairy milk in coffee',
      description: 'Oat-based beverage designed for coffee drinks.',
      base: 'Oats',
      uses: 'Steam, froth or pour into coffee.',
      priceTier: 'premium',
      emoji: '☕'
    },
    {
      name: 'Original Almondmilk Creamer',
      brand: 'Silk',
      category: 'Creamer',
      replaces: 'Dairy coffee creamer',
      description: 'Almond-based coffee creamer.',
      base: 'Almonds',
      uses: 'Add to hot or iced coffee.',
      priceTier: 'moderate',
      emoji: '☕'
    },
    {
      name: 'French Vanilla Coconutmilk Creamer',
      brand: 'So Delicious',
      category: 'Creamer',
      replaces: 'Flavored dairy creamer',
      description: 'Vanilla-flavored coconut-based coffee creamer.',
      base: 'Coconut',
      uses: 'Add to coffee, tea and blended drinks.',
      priceTier: 'moderate',
      emoji: '☕'
    },
  
    // ==========================================================
    // CHEESE AND CREAM CHEESE
    // ==========================================================
    {
      name: 'Just Like Cheddar Slices',
      brand: 'Violife',
      category: 'Cheese',
      replaces: 'Cheddar cheese slices',
      description: 'Plant-based cheddar-style slices for sandwiches and burgers.',
      base: 'Coconut oil',
      uses: 'Use on sandwiches, burgers and grilled cheese.',
      priceTier: 'moderate',
      featured: true,
      emoji: '🧀'
    },
    {
      name: 'Just Like Mozzarella Shreds',
      brand: 'Violife',
      category: 'Cheese',
      replaces: 'Mozzarella cheese',
      description: 'Plant-based mozzarella-style shreds.',
      base: 'Coconut oil',
      uses: 'Use on pizza, pasta, casseroles and baked dishes.',
      priceTier: 'moderate',
      emoji: '🧀'
    },
    {
      name: 'Cheddar Style Shreds',
      brand: 'Daiya',
      category: 'Cheese',
      replaces: 'Shredded cheddar cheese',
      description: 'Plant-based cheddar-style shreds.',
      base: 'Plant starches and oils',
      uses: 'Use in tacos, casseroles, potatoes and macaroni.',
      priceTier: 'moderate',
      emoji: '🧀'
    },
    {
      name: 'Mozzarella Style Shreds',
      brand: 'Daiya',
      category: 'Cheese',
      replaces: 'Shredded mozzarella cheese',
      description: 'Plant-based mozzarella-style shreds.',
      base: 'Plant starches and oils',
      uses: 'Use on pizza, pasta and casseroles.',
      priceTier: 'moderate',
      emoji: '🧀'
    },
    {
      name: 'Creamy Original Chao Slices',
      brand: 'Field Roast',
      category: 'Cheese',
      replaces: 'Cheese slices',
      description: 'Plant-based cheese-style slices made with fermented tofu seasoning.',
      base: 'Coconut oil and tofu seasoning',
      uses: 'Use on sandwiches, burgers and grilled cheese.',
      priceTier: 'moderate',
      emoji: '🧀'
    },
    {
      name: 'Smoked Provolone Style Slices',
      brand: 'Follow Your Heart',
      category: 'Cheese',
      replaces: 'Provolone cheese',
      description: 'Smoky plant-based provolone-style slices.',
      base: 'Plant oils and starches',
      uses: 'Use in sandwiches, burgers and melts.',
      priceTier: 'moderate',
      emoji: '🧀'
    },
    {
      name: 'Parmesan Style Shreds',
      brand: 'Follow Your Heart',
      category: 'Cheese',
      replaces: 'Parmesan cheese',
      description: 'Plant-based parmesan-style shreds.',
      base: 'Plant oils and starches',
      uses: 'Sprinkle on pasta, pizza, salads and vegetables.',
      priceTier: 'moderate',
      emoji: '🧀'
    },
    {
      name: 'Plain Plant-Based Cream Cheese',
      brand: 'Kite Hill',
      category: 'Cream Cheese',
      replaces: 'Dairy cream cheese',
      description: 'Almond-based cream cheese alternative.',
      base: 'Almonds',
      uses: 'Spread on bagels or use in dips and recipes.',
      priceTier: 'premium',
      emoji: '🧀'
    },
    {
      name: 'Plain Dairy-Free Cream Cheese',
      brand: 'Tofutti',
      category: 'Cream Cheese',
      replaces: 'Dairy cream cheese',
      description: 'Soy-based cream cheese alternative.',
      base: 'Soy',
      uses: 'Spread on bagels or use in dips and desserts.',
      priceTier: 'moderate',
      emoji: '🧀'
    },
  
    // ==========================================================
    // BUTTER, MAYONNAISE AND EGGS
    // ==========================================================
    {
      name: 'Original Buttery Spread',
      brand: 'Earth Balance',
      category: 'Butter',
      replaces: 'Dairy butter',
      description: 'Plant-based buttery spread for toast, cooking and baking.',
      base: 'Plant oils',
      uses: 'Spread, sauté or use in baking according to recipe requirements.',
      priceTier: 'moderate',
      featured: true,
      emoji: '🧈'
    },
    {
      name: 'Plant Butter with Olive Oil',
      brand: 'Country Crock',
      category: 'Butter',
      replaces: 'Dairy butter',
      description: 'Plant-based butter alternative made with plant oils.',
      base: 'Plant oils',
      uses: 'Spread, cook or bake according to package directions.',
      priceTier: 'budget',
      emoji: '🧈'
    },
    {
      name: 'Miyoko’s European Style Plant Milk Butter',
      brand: 'Miyoko’s Creamery',
      category: 'Butter',
      replaces: 'Dairy butter',
      description: 'Cultured plant-based butter for spreading, cooking and baking.',
      base: 'Cashews and coconut oil',
      uses: 'Use on bread or in cooking and baking.',
      priceTier: 'premium',
      emoji: '🧈'
    },
    {
      name: 'Vegenaise Original',
      brand: 'Follow Your Heart',
      category: 'Mayonnaise',
      replaces: 'Egg mayonnaise',
      description: 'Egg-free mayonnaise-style spread.',
      base: 'Plant oil',
      uses: 'Use in sandwiches, dressings, dips and salads.',
      priceTier: 'moderate',
      emoji: '🥪'
    },
    {
      name: 'Vegan Dressing & Spread',
      brand: 'Hellmann’s',
      category: 'Mayonnaise',
      replaces: 'Egg mayonnaise',
      description: 'Egg-free mayonnaise-style dressing and spread.',
      base: 'Plant oil',
      uses: 'Use in sandwiches, dressings, dips and salads.',
      priceTier: 'budget',
      emoji: '🥪'
    },
    {
      name: 'JUST Egg',
      brand: 'JUST Egg',
      category: 'Eggs',
      replaces: 'Chicken eggs',
      description: 'Pourable plant-based egg alternative for scrambling and omelets.',
      base: 'Mung bean protein',
      uses: 'Cook as scrambled eggs or use in savory breakfast dishes.',
      priceTier: 'premium',
      dietaryTags: ['high-protein'],
      featured: true,
      emoji: '🥚'
    },
    {
      name: 'JUST Egg Folded',
      brand: 'JUST Egg',
      category: 'Eggs',
      replaces: 'Folded chicken egg',
      description: 'Frozen folded plant-based egg portion for breakfast sandwiches.',
      base: 'Mung bean protein',
      uses: 'Heat and add to breakfast sandwiches or plates.',
      priceTier: 'premium',
      dietaryTags: ['high-protein'],
      emoji: '🥚'
    },
  
    // ==========================================================
    // YOGURT
    // ==========================================================
    {
      name: 'Plain Almond Milk Yogurt',
      brand: 'Kite Hill',
      category: 'Yogurt',
      replaces: 'Dairy yogurt',
      description: 'Almond-based cultured yogurt alternative.',
      base: 'Almonds',
      uses: 'Eat with fruit or use in smoothies, sauces and dressings.',
      priceTier: 'premium',
      emoji: '🥣'
    },
    {
      name: 'Oatmilk Yogurt Alternative',
      brand: 'Oatly',
      category: 'Yogurt',
      replaces: 'Dairy yogurt',
      description: 'Cultured oat-based yogurt alternative.',
      base: 'Oats',
      uses: 'Eat as a snack or use with granola and fruit.',
      priceTier: 'moderate',
      emoji: '🥣'
    },
    {
      name: 'Coconutmilk Yogurt Alternative',
      brand: 'So Delicious',
      category: 'Yogurt',
      replaces: 'Dairy yogurt',
      description: 'Cultured coconut-based yogurt alternative.',
      base: 'Coconut',
      uses: 'Eat as a snack or use in breakfast bowls and smoothies.',
      priceTier: 'moderate',
      emoji: '🥣'
    },
    {
      name: 'Soymilk Yogurt Alternative',
      brand: 'Silk',
      category: 'Yogurt',
      replaces: 'Dairy yogurt',
      description: 'Cultured soy-based yogurt alternative.',
      base: 'Soybeans',
      uses: 'Eat as a snack or use with granola and fruit.',
      priceTier: 'budget',
      emoji: '🥣'
    },
  
    // ==========================================================
    // ICE CREAM AND DESSERT
    // ==========================================================
    {
      name: 'Vanilla Frozen Dessert',
      brand: 'Oatly',
      category: 'Ice Cream',
      replaces: 'Dairy ice cream',
      description: 'Vanilla oat-based frozen dessert.',
      base: 'Oats',
      uses: 'Serve as a frozen dessert or with pies and baked goods.',
      priceTier: 'premium',
      featured: true,
      emoji: '🍨'
    },
    {
      name: 'Chocolate Frozen Dessert',
      brand: 'Oatly',
      category: 'Ice Cream',
      replaces: 'Dairy ice cream',
      description: 'Chocolate oat-based frozen dessert.',
      base: 'Oats',
      uses: 'Serve as a frozen dessert or blend into shakes.',
      priceTier: 'premium',
      emoji: '🍨'
    },
    {
      name: 'Coconutmilk Frozen Dessert',
      brand: 'So Delicious',
      category: 'Ice Cream',
      replaces: 'Dairy ice cream',
      description: 'Coconut-based frozen dessert available in multiple flavors.',
      base: 'Coconut',
      uses: 'Serve as a frozen dessert.',
      priceTier: 'moderate',
      verificationNote: 'Verify the exact flavor because ingredients and allergens differ across the product line.',
      emoji: '🍨'
    },
    {
      name: 'Cashewmilk Frozen Dessert',
      brand: 'So Delicious',
      category: 'Ice Cream',
      replaces: 'Dairy ice cream',
      description: 'Cashew-based frozen dessert available in multiple flavors.',
      base: 'Cashews',
      uses: 'Serve as a frozen dessert.',
      priceTier: 'premium',
      verificationNote: 'Verify the exact flavor because ingredients and allergens differ across the product line.',
      emoji: '🍨'
    },
    {
      name: 'Non-Dairy Frozen Dessert',
      brand: 'Ben & Jerry’s',
      category: 'Ice Cream',
      replaces: 'Dairy ice cream',
      description: 'Non-dairy frozen dessert sold in multiple flavors.',
      base: 'Varies by flavor',
      uses: 'Serve as a frozen dessert.',
      priceTier: 'premium',
      verificationNote: 'The base, ingredients and allergens vary by flavor. Confirm that the exact pint is part of the non-dairy line and verify its current label.',
      emoji: '🍨'
    },
    {
      name: 'Non-Dairy Oatmilk Frozen Dessert',
      brand: 'Talenti',
      category: 'Ice Cream',
      replaces: 'Dairy gelato',
      description: 'Oat-based frozen dessert sold in selected flavors.',
      base: 'Oats',
      uses: 'Serve as a frozen dessert.',
      priceTier: 'premium',
      verificationNote: 'Verify the exact variety because Talenti also sells dairy products.',
      emoji: '🍨'
    },
  
    // ==========================================================
    // FROZEN MEALS AND CONVENIENCE FOODS
    // ==========================================================
    {
      name: 'Vegan Mac & Cheeze',
      brand: 'Daiya',
      category: 'Prepared Meal',
      replaces: 'Dairy macaroni and cheese',
      description: 'Prepared plant-based macaroni and cheese alternative.',
      base: 'Pasta and plant-based cheese sauce',
      uses: 'Heat and serve as a meal or side dish.',
      priceTier: 'moderate',
      emoji: '🫕'
    },
    {
      name: 'Plant-Based Pepperoni Pizza',
      brand: 'Daiya',
      category: 'Pizza',
      replaces: 'Pepperoni and cheese pizza',
      description: 'Frozen pizza with plant-based cheese and pepperoni-style topping.',
      base: 'Plant-based cheese and meat alternatives',
      uses: 'Bake from frozen according to package directions.',
      priceTier: 'premium',
      emoji: '🍕'
    },
    {
      name: 'Vegetable Pad Thai',
      brand: 'Amy’s',
      category: 'Prepared Meal',
      replaces: 'Restaurant pad Thai',
      description: 'Frozen plant-based noodle meal.',
      base: 'Rice noodles and vegetables',
      uses: 'Heat according to package directions.',
      priceTier: 'moderate',
      verificationNote: 'Amy’s sells both vegan and vegetarian meals. Confirm that the exact current package is labeled vegan.',
      emoji: '🍜'
    },
    {
      name: 'Vegan Margherita Pizza',
      brand: 'Blackbird Foods',
      category: 'Pizza',
      replaces: 'Cheese pizza',
      description: 'Frozen vegan pizza with plant-based cheese.',
      base: 'Wheat crust and plant-based cheese',
      uses: 'Bake from frozen according to package directions.',
      priceTier: 'premium',
      emoji: '🍕'
    }
  ];
  
  commercialProducts.forEach(addProduct);
  
  // ============================================================
  // WHOLE-FOOD AND HOMEMADE ALTERNATIVES
  // ============================================================
  const wholeFoodProducts = [
    {
      name: 'Black Bean Burger',
      brand: 'Homemade',
      category: 'Whole-Food',
      replaces: 'Beef burger',
      description: 'Burger patties made from black beans, oats, vegetables and seasonings.',
      base: 'Black beans and oats',
      uses: 'Shape into patties and bake or pan-cook.',
      priceTier: 'budget',
      dietaryTags: ['high-protein'],
      companyScope: 'not-applicable',
      productStatus: 'homemade-vegan',
      verificationNote: 'Vegan when prepared entirely with plant-based ingredients.',
      region: 'Anywhere',
      availability: 'Made from common grocery ingredients.',
      emoji: '🍔'
    },
    {
      name: 'Lentil Burger',
      brand: 'Homemade',
      category: 'Whole-Food',
      replaces: 'Beef burger',
      description: 'Budget-friendly burger patties made from cooked lentils.',
      base: 'Lentils and oats',
      uses: 'Shape into patties and bake or pan-cook.',
      priceTier: 'budget',
      dietaryTags: ['high-protein'],
      companyScope: 'not-applicable',
      productStatus: 'homemade-vegan',
      verificationNote: 'Vegan when prepared entirely with plant-based ingredients.',
      region: 'Anywhere',
      availability: 'Made from common grocery ingredients.',
      emoji: '🍔'
    },
    {
      name: 'Walnut Lentil Taco Meat',
      brand: 'Homemade',
      category: 'Whole-Food',
      replaces: 'Ground taco meat',
      description: 'Savory taco filling made from lentils, walnuts and seasonings.',
      base: 'Lentils and walnuts',
      uses: 'Use in tacos, burritos, nachos and bowls.',
      priceTier: 'budget',
      dietaryTags: ['high-protein'],
      companyScope: 'not-applicable',
      productStatus: 'homemade-vegan',
      verificationNote: 'Contains tree nuts. Vegan when prepared entirely with plant-based ingredients.',
      region: 'Anywhere',
      availability: 'Made from common grocery ingredients.',
      emoji: '🌮'
    },
    {
      name: 'Mushroom Walnut Ground',
      brand: 'Homemade',
      category: 'Whole-Food',
      replaces: 'Ground meat',
      description: 'Chopped mushroom and walnut mixture for tacos, pasta and stuffing.',
      base: 'Mushrooms and walnuts',
      uses: 'Sauté and season for tacos, pasta sauce or casseroles.',
      priceTier: 'budget',
      companyScope: 'not-applicable',
      productStatus: 'homemade-vegan',
      verificationNote: 'Contains tree nuts. Vegan when prepared entirely with plant-based ingredients.',
      region: 'Anywhere',
      availability: 'Made from common grocery ingredients.',
      emoji: '🍄'
    },
    {
      name: 'Tofu Scramble',
      brand: 'Homemade',
      category: 'Whole-Food',
      replaces: 'Scrambled eggs',
      description: 'Crumbled tofu cooked with seasonings and optional vegetables.',
      base: 'Tofu',
      uses: 'Serve at breakfast or use in burritos and sandwiches.',
      priceTier: 'budget',
      dietaryTags: ['high-protein'],
      companyScope: 'not-applicable',
      productStatus: 'homemade-vegan',
      verificationNote: 'Contains soy. Vegan when prepared entirely with plant-based ingredients.',
      region: 'Anywhere',
      availability: 'Made from common grocery ingredients.',
      emoji: '🍳'
    },
    {
      name: 'Chickpea Salad',
      brand: 'Homemade',
      category: 'Whole-Food',
      replaces: 'Tuna or chicken salad',
      description: 'Mashed chickpeas mixed with vegan mayonnaise, vegetables and seasonings.',
      base: 'Chickpeas',
      uses: 'Use in sandwiches, wraps, salads or with crackers.',
      priceTier: 'budget',
      dietaryTags: ['high-protein'],
      companyScope: 'not-applicable',
      productStatus: 'homemade-vegan',
      verificationNote: 'Verify that the mayonnaise and seasonings used are vegan.',
      region: 'Anywhere',
      availability: 'Made from common grocery ingredients.',
      emoji: '🥪'
    },
    {
      name: 'Carrot Lox',
      brand: 'Homemade',
      category: 'Whole-Food',
      replaces: 'Smoked salmon',
      description: 'Marinated roasted carrots prepared with smoky and briny flavors.',
      base: 'Carrots',
      uses: 'Serve on bagels, toast or appetizer plates.',
      priceTier: 'budget',
      companyScope: 'not-applicable',
      productStatus: 'homemade-vegan',
      verificationNote: 'Vegan when prepared entirely with plant-based ingredients.',
      region: 'Anywhere',
      availability: 'Made from common grocery ingredients.',
      emoji: '🥕'
    },
    {
      name: 'Cashew Cream Cheese',
      brand: 'Homemade',
      category: 'Whole-Food',
      replaces: 'Dairy cream cheese',
      description: 'Creamy spread made from blended soaked cashews.',
      base: 'Cashews',
      uses: 'Spread on bagels or use in dips and sauces.',
      priceTier: 'budget',
      companyScope: 'not-applicable',
      productStatus: 'homemade-vegan',
      verificationNote: 'Contains tree nuts. Vegan when prepared entirely with plant-based ingredients.',
      region: 'Anywhere',
      availability: 'Made from common grocery ingredients.',
      emoji: '🧀'
    },
    {
      name: 'Sunflower Seed Cheese',
      brand: 'Homemade',
      category: 'Whole-Food',
      replaces: 'Soft dairy cheese',
      description: 'Creamy savory spread made from soaked sunflower seeds.',
      base: 'Sunflower seeds',
      uses: 'Use as a spread, dip or sandwich filling.',
      priceTier: 'budget',
      companyScope: 'not-applicable',
      productStatus: 'homemade-vegan',
      verificationNote: 'Vegan when prepared entirely with plant-based ingredients.',
      region: 'Anywhere',
      availability: 'Made from common grocery ingredients.',
      emoji: '🧀'
    },
    {
      name: 'Oat Milk',
      brand: 'Homemade',
      category: 'Whole-Food',
      replaces: 'Dairy milk',
      description: 'Simple milk alternative made by blending oats and water.',
      base: 'Oats',
      uses: 'Use in cereal, smoothies, coffee and selected recipes.',
      priceTier: 'budget',
      companyScope: 'not-applicable',
      productStatus: 'homemade-vegan',
      verificationNote: 'Homemade oat milk is usually not nutritionally equivalent to fortified commercial plant milk and may not perform well in every recipe.',
      region: 'Anywhere',
      availability: 'Made from oats and water.',
      emoji: '🥛'
    },
    {
      name: 'Flax Egg',
      brand: 'Homemade',
      category: 'Whole-Food',
      replaces: 'Eggs in baking',
      description: 'Ground flaxseed mixed with water to create a baking binder.',
      base: 'Ground flaxseed',
      uses: 'Use as a binder in muffins, pancakes, cookies and quick breads.',
      priceTier: 'budget',
      companyScope: 'not-applicable',
      productStatus: 'homemade-vegan',
      verificationNote: 'Useful for binding but does not replace eggs in every culinary application.',
      region: 'Anywhere',
      availability: 'Made from ground flaxseed and water.',
      emoji: '🥚'
    },
    {
      name: 'Chia Egg',
      brand: 'Homemade',
      category: 'Whole-Food',
      replaces: 'Eggs in baking',
      description: 'Ground chia seeds mixed with water to create a baking binder.',
      base: 'Chia seeds',
      uses: 'Use as a binder in muffins, pancakes and quick breads.',
      priceTier: 'budget',
      companyScope: 'not-applicable',
      productStatus: 'homemade-vegan',
      verificationNote: 'Useful for binding but does not replace eggs in every culinary application.',
      region: 'Anywhere',
      availability: 'Made from chia seeds and water.',
      emoji: '🥚'
    },
    {
      name: 'Aquafaba',
      brand: 'Homemade',
      category: 'Whole-Food',
      replaces: 'Egg whites',
      description: 'Liquid from cooked or canned chickpeas that can be whipped or used as a binder.',
      base: 'Chickpea cooking liquid',
      uses: 'Use in meringues, mousse, baking and selected sauces.',
      priceTier: 'budget',
      companyScope: 'not-applicable',
      productStatus: 'homemade-vegan',
      verificationNote: 'Performance depends on concentration and recipe. Use unsalted or low-sodium aquafaba when appropriate.',
      region: 'Anywhere',
      availability: 'Obtained from canned or home-cooked chickpeas.',
      emoji: '🥚'
    },
    {
      name: 'Banana Nice Cream',
      brand: 'Homemade',
      category: 'Whole-Food',
      replaces: 'Dairy ice cream',
      description: 'Frozen blended bananas with optional plant-based flavorings.',
      base: 'Frozen bananas',
      uses: 'Blend and serve immediately or freeze for a firmer texture.',
      priceTier: 'budget',
      companyScope: 'not-applicable',
      productStatus: 'homemade-vegan',
      verificationNote: 'Vegan when all added flavorings and mix-ins are plant-based.',
      region: 'Anywhere',
      availability: 'Made from frozen bananas.',
      emoji: '🍨'
    }
  ];
  
  wholeFoodProducts.forEach(addProduct);


  // ---- Phase 4: manufacturer product verification ----
  const manufacturerEvidence = {
  "Impossible Foods": {
    "id": "src-product-impossible",
    "url": "https://impossiblefoods.com/",
    "status": "appears-vegan-check-label"
  },
  "Beyond Meat": {
    "id": "src-product-beyond",
    "url": "https://www.beyondmeat.com/en-US/products/",
    "status": "appears-vegan-check-label"
  },
  "Gardein": {
    "id": "src-product-gardein",
    "url": "https://www.gardein.com/",
    "status": "manufacturer-labeled-vegan"
  },
  "Dr. Praeger’s": {
    "id": "src-product-dr-praegers",
    "url": "https://www.drpraegers.com/products/",
    "status": "manufacturer-labeled-vegan"
  },
  "Boca": {
    "id": "src-product-boca",
    "url": "https://www.bocaburger.com/",
    "status": "verify-current-packaging"
  },
  "Meati": {
    "id": "src-product-meati",
    "url": "https://www.meati.com/products/",
    "status": "appears-vegan-check-label"
  },
  "MorningStar Farms": {
    "id": "src-product-morningstar",
    "url": "https://www.morningstarfarms.com/en_US/products.html",
    "status": "verify-current-packaging"
  },
  "Daring": {
    "id": "src-product-daring",
    "url": "https://daring.com/",
    "status": "manufacturer-labeled-vegan"
  },
  "Abbot’s": {
    "id": "src-product-abbots",
    "url": "https://abbots.com/",
    "status": "appears-vegan-check-label"
  },
  "Tofurky": {
    "id": "src-product-tofurky",
    "url": "https://tofurky.com/what-we-make/",
    "status": "manufacturer-labeled-vegan"
  },
  "Field Roast": {
    "id": "src-product-field-roast",
    "url": "https://fieldroast.com/products/",
    "status": "appears-vegan-check-label"
  },
  "Lightlife": {
    "id": "src-product-lightlife",
    "url": "https://lightlife.com/our-food/",
    "status": "appears-vegan-check-label"
  },
  "Good Catch": {
    "id": "src-product-good-catch",
    "url": "https://goodcatchfoods.com/our-products/",
    "status": "appears-vegan-check-label"
  },
  "Silk": {
    "id": "src-product-silk",
    "url": "https://silk.com/plant-based-products/",
    "status": "manufacturer-labeled-vegan"
  },
  "Oatly": {
    "id": "src-product-oatly",
    "url": "https://www.oatly.com/en-us/products",
    "status": "manufacturer-labeled-vegan"
  },
  "Planet Oat": {
    "id": "src-product-planet-oat",
    "url": "https://planetoat.com/products/",
    "status": "appears-vegan-check-label"
  },
  "Almond Breeze": {
    "id": "src-product-almond-breeze",
    "url": "https://www.bluediamond.com/brand/almond-breeze/",
    "status": "appears-vegan-check-label"
  },
  "Califia Farms": {
    "id": "src-product-califia",
    "url": "https://www.califiafarms.com/collections/all-products",
    "status": "manufacturer-labeled-vegan"
  },
  "Ripple": {
    "id": "src-product-ripple",
    "url": "https://ripplefoods.com/collections/all",
    "status": "appears-vegan-check-label"
  },
  "So Delicious": {
    "id": "src-product-so-delicious",
    "url": "https://sodeliciousdairyfree.com/about-us/faqs",
    "status": "manufacturer-labeled-vegan"
  },
  "Good Karma": {
    "id": "src-product-good-karma",
    "url": "https://goodkarmafoods.com/products/",
    "status": "appears-vegan-check-label"
  },
  "Violife": {
    "id": "src-product-violife",
    "url": "https://www.violife.com/en-us/products",
    "status": "manufacturer-labeled-vegan"
  },
  "Daiya": {
    "id": "src-product-daiya",
    "url": "https://daiyafoods.com/collections/all",
    "status": "appears-vegan-check-label"
  },
  "Follow Your Heart": {
    "id": "src-product-fyh",
    "url": "https://followyourheart.com/products/",
    "status": "manufacturer-labeled-vegan"
  },
  "Kite Hill": {
    "id": "src-product-kite-hill",
    "url": "https://www.kite-hill.com/our-foods/",
    "status": "appears-vegan-check-label"
  },
  "Tofutti": {
    "id": "src-product-tofutti",
    "url": "https://tofutti.com/frozen-desserts/",
    "status": "appears-vegan-check-label"
  },
  "Earth Balance": {
    "id": "src-product-earth-balance",
    "url": "https://www.earthbalancenatural.com/products",
    "status": "appears-vegan-check-label"
  },
  "Country Crock": {
    "id": "src-product-country-crock",
    "url": "https://www.countrycrock.com/en-us/our-products/plant-butter",
    "status": "appears-vegan-check-label"
  },
  "Miyoko’s Creamery": {
    "id": "src-product-miyokos",
    "url": "https://www.miyokos.com/collections/all",
    "status": "manufacturer-labeled-vegan"
  },
  "Hellmann’s": {
    "id": "src-product-hellmanns",
    "url": "https://www.hellmanns.com/us/en/p/vegan-dressing-spread.html/00048001010554",
    "status": "manufacturer-labeled-vegan"
  },
  "JUST Egg": {
    "id": "src-product-just-egg",
    "url": "https://www.ju.st/eat/just-egg",
    "status": "appears-vegan-check-label"
  },
  "Ben & Jerry’s": {
    "id": "src-product-ben-jerrys",
    "url": "https://www.benjerry.com/flavors/non-dairy",
    "status": "manufacturer-labeled-vegan"
  },
  "Talenti": {
    "id": "src-product-talenti",
    "url": "https://www.talentigelato.com/us/en/products.html",
    "status": "verify-current-packaging"
  },
  "Amy’s": {
    "id": "src-product-amys",
    "url": "https://www.amys.com/our-foods",
    "status": "verify-current-packaging"
  },
  "Blackbird Foods": {
    "id": "src-product-blackbird",
    "url": "https://www.blackbirdfoods.com/",
    "status": "verify-current-packaging"
  }
};
  const unconfirmedProductIds = new Set(["product-boca-original-vegan-veggie-burgers","product-morningstar-farms-plant-based-chick-n-nuggets","product-abbot-s-plant-based-chick-n-pieces","product-good-catch-plant-based-breaded-shrimp","product-talenti-non-dairy-oatmilk-frozen-dessert","product-amy-s-vegetable-pad-thai","product-blackbird-foods-vegan-margherita-pizza"]);
  const exactProductUrls = {
  "product-beyond-meat-beyond-beef": "https://www.beyondmeat.com/en-US/products/beyond-beef",
  "product-meati-plant-based-steak": "https://www.meati.com/products/classic-steak",
  "product-dr-praeger-s-all-american-veggie-burgers": "https://www.drpraegers.com/products/all-american-drive-thru-burger",
  "product-gardein-f-sh-filets": "https://www.gardein.com/fishless/plant-based-fsh-filets",
  "product-gardein-mandarin-orange-crispy-chick-n": "https://www.gardein.com/chickn-and-turky/classics/plant-based-mandarin-orange-crispy-chickn",
  "product-tofurky-hickory-smoked-plant-based-deli-slices": "https://tofurky.com/what-we-make/deli-slices/hickory-smoked/",
  "product-good-catch-plant-based-fish-sticks": "https://goodcatchfoods.com/our-products/",
  "product-good-catch-plant-based-tuna": "https://goodcatchfoods.com/our-products/",
  "product-violife-just-like-cheddar-slices": "https://www.violife.com/en-us/products/dairy-free-cheese-slices/just-like-american-sandwich-slices",
  "product-daiya-cheddar-style-shreds": "https://daiyafoods.com/products/dairy-free-cheddar-shreds",
  "product-daiya-mozzarella-style-shreds": "https://daiyafoods.com/products/dairy-free-mozzarella-shreds",
  "product-follow-your-heart-vegenaise-original": "https://followyourheart.com/products/original-vegenaise/",
  "product-oatly-oat-creamer": "https://www.oatly.com/en-us/products/creamer/oatmilk-creamer-sweet-creamy-32-oz",
  "product-so-delicious-coconutmilk-frozen-dessert": "https://sodeliciousdairyfree.com/dairy-free-foods/dairy-free-frozen-desserts/coconutmilk/no-sugar-added-vanilla-bean"
};
  products.forEach(product => {
    if (product.brand === 'Homemade') {
      product.productStatus = 'homemade-vegan';
      product.lastVerified = '2026-08-20';
      product.verificationScope = 'recipe-concept';
      product.ingredientsSummary = 'Homemade whole-food concept; final status depends on the ingredients used.';
      product.verificationNote = 'Use vegan-labeled ingredients and check sauces, seasonings and optional additions.';
      product.needsResearch = false;
      return;
    }
    const evidence = manufacturerEvidence[product.brand];
    product.lastVerified = '2026-08-20';
    product.region = 'United States';
    product.ingredientsSummary = 'Primary base: ' + product.base + '. Consult the linked manufacturer page and current package for the complete ingredient and allergen statement.';
    if (!evidence || unconfirmedProductIds.has(product.id)) {
      product.productStatus = 'verify-current-packaging';
      product.verificationScope = 'exact-current-listing-not-confirmed';
      product.productUrl = evidence ? evidence.url : '';
      product.sourceIds = evidence ? [evidence.id] : [];
      product.availability = 'Exact current manufacturer listing was not confirmed on 2026-08-20; availability may be limited, renamed or discontinued.';
      product.verificationNote = 'Do not rely on the product name alone. Confirm the exact current package, ingredients and manufacturer listing before purchasing.';
      product.needsResearch = true;
      return;
    }
    product.productStatus = evidence.status;
    product.verificationScope = exactProductUrls[product.id] ? 'exact-manufacturer-product-page' : 'current-manufacturer-catalog';
    product.productUrl = exactProductUrls[product.id] || evidence.url;
    product.sourceIds = [evidence.id];
    product.availability = 'Listed or represented in the manufacturer’s current U.S. catalog; retailer availability varies by location.';
    product.verificationNote = evidence.status === 'manufacturer-labeled-vegan'
      ? 'Manufacturer currently describes this product or product line as vegan. Recheck the current package for formula and allergen changes.'
      : 'Manufacturer describes the product as plant-based or dairy-free, but that wording is not treated here as equivalent to a verified vegan certification. Check the current package.';
    product.needsResearch = false;
  });

  // ---- Recipes ----
  const recipes = [];
  function addRecipe(r) {
    recipes.push({
      id: r.id || 'recipe-' + r.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: r.title || '',
      description: r.description || '',
      category: r.category || 'Main',
      ingredients: r.ingredients || [],
      instructions: r.instructions || [],
      totalMinutes: r.totalMinutes || 30,
      difficulty: r.difficulty || 'beginner',
      estimatedCost: r.estimatedCost || 'budget',
      dietaryTags: r.dietaryTags || [],
      emoji: r.emoji || '🍽️',
      sourceIds: r.sourceIds || [],
      alternativeIds: Array.isArray(r.alternativeIds) ? r.alternativeIds : [],
      substitutionNotes: r.substitutionNotes || [],
      storageNotes: r.storageNotes || '',
      testingStatus: r.testingStatus || 'needs-kitchen-test',
      needsResearch: r.needsResearch ?? false
    });
  }

  addRecipe({
    title: 'Tofu Scramble',
    description: 'Classic vegan scrambled eggs made with tofu.',
    category: 'Breakfast',
    ingredients: [
      { amount: '1', unit: 'block', item: 'firm tofu, crumbled' },
      { amount: '1', unit: 'tbsp', item: 'nutritional yeast' },
      { amount: '1/2', unit: 'tsp', item: 'turmeric' },
      { amount: '1/2', unit: 'tsp', item: 'garlic powder' },
      { amount: 'to taste', unit: '', item: 'salt and pepper' }
    ],
    instructions: [
      'Heat a non-stick pan over medium heat.',
      'Add crumbled tofu and cook for 5 minutes, stirring occasionally.',
      'Add nutritional yeast, turmeric, garlic powder, salt, and pepper.',
      'Cook for another 3-5 minutes until heated through and slightly golden.',
      'Serve hot with toast or vegetables.'
    ],
    totalMinutes: 15,
    difficulty: 'beginner',
    estimatedCost: 'budget',
    dietaryTags: ['high-protein', 'peanut-free', 'tree-nut-free'],
    emoji: '🍳'
  });

  addRecipe({
    title: 'Overnight Oats',
    description: 'Creamy, no-cook breakfast oats.',
    category: 'Breakfast',
    ingredients: [
      { amount: '1/2', unit: 'cup', item: 'rolled oats' },
      { amount: '1', unit: 'cup', item: 'plant milk' },
      { amount: '1', unit: 'tbsp', item: 'maple syrup' },
      { amount: '1/2', unit: 'cup', item: 'berries' }
    ],
    instructions: [
      'Mix oats, plant milk, and maple syrup in a jar.',
      'Refrigerate overnight (or at least 4 hours).',
      'Top with berries before serving.'
    ],
    totalMinutes: 5,
    difficulty: 'beginner',
    estimatedCost: 'budget',
    dietaryTags: ['soy-free', 'peanut-free', 'tree-nut-free'],
    emoji: '🥣'
  });

  addRecipe({
    title: 'Black Bean Burger',
    description: 'Hearty, flavorful black bean burgers.',
    category: 'Lunch',
    ingredients: [
      { amount: '1', unit: 'can', item: 'black beans, drained and mashed' },
      { amount: '1/2', unit: 'cup', item: 'breadcrumbs' },
      { amount: '1/4', unit: 'cup', item: 'onion, minced' },
      { amount: '1', unit: 'tsp', item: 'cumin' },
      { amount: 'to taste', unit: '', item: 'salt and pepper' }
    ],
    instructions: [
      'Mash black beans in a bowl.',
      'Add breadcrumbs, onion, cumin, salt, and pepper. Mix well.',
      'Form into patties.',
      'Pan-fry or bake until golden and crisp.'
    ],
    totalMinutes: 25,
    difficulty: 'beginner',
    estimatedCost: 'budget',
    dietaryTags: ['soy-free', 'peanut-free', 'tree-nut-free', 'high-protein'],
    emoji: '🍔'
  });

  addRecipe({
    title: 'Chickpea Curry',
    description: 'Creamy, flavorful chickpea curry.',
    category: 'Dinner',
    ingredients: [
      { amount: '1', unit: 'can', item: 'chickpeas' },
      { amount: '1', unit: 'can', item: 'coconut milk' },
      { amount: '2', unit: 'tbsp', item: 'curry powder' },
      { amount: '1', unit: '', item: 'onion, diced' }
    ],
    instructions: [
      'Sauté onion until soft.',
      'Add curry powder, chickpeas, and coconut milk.',
      'Simmer for 15-20 minutes.',
      'Serve with rice.'
    ],
    totalMinutes: 30,
    difficulty: 'beginner',
    estimatedCost: 'budget',
    dietaryTags: ['soy-free', 'peanut-free', 'tree-nut-free', 'high-protein'],
    emoji: '🍛'
  });

  addRecipe({
    title: 'Vegan Pancakes',
    description: 'Fluffy, classic pancakes made without eggs or dairy.',
    category: 'Breakfast',
    ingredients: [
      { amount: '1', unit: 'cup', item: 'all-purpose flour' },
      { amount: '1', unit: 'tbsp', item: 'baking powder' },
      { amount: '1', unit: 'tbsp', item: 'sugar' },
      { amount: '1', unit: 'cup', item: 'plant milk' },
      { amount: '1', unit: 'tbsp', item: 'oil' }
    ],
    instructions: [
      'Whisk together flour, baking powder, and sugar.',
      'Add plant milk and oil, mix until just combined.',
      'Cook on a hot griddle until bubbles form, flip, and cook until golden.'
    ],
    totalMinutes: 20,
    difficulty: 'beginner',
    estimatedCost: 'budget',
    dietaryTags: ['soy-free', 'peanut-free', 'tree-nut-free'],
    emoji: '🥞'
  });

  addRecipe({
    title: 'Chickpea Tuna Salad',
    description: 'Classic tuna salad made with chickpeas.',
    category: 'Lunch',
    ingredients: [
      { amount: '1', unit: 'can', item: 'chickpeas, mashed' },
      { amount: '2', unit: 'tbsp', item: 'vegan mayo' },
      { amount: '1', unit: 'tbsp', item: 'mustard' },
      { amount: '1/4', unit: 'cup', item: 'celery, diced' }
    ],
    instructions: [
      'Mash chickpeas in a bowl.',
      'Add mayo, mustard, and celery. Mix well.',
      'Serve on bread or with crackers.'
    ],
    totalMinutes: 10,
    difficulty: 'beginner',
    estimatedCost: 'budget',
    dietaryTags: ['soy-free', 'peanut-free', 'tree-nut-free', 'high-protein'],
    emoji: '🐟'
  });

  addRecipe({
    title: 'Banana Nice Cream',
    description: 'Creamy ice cream made from frozen bananas.',
    category: 'Dessert',
    ingredients: [
      { amount: '2', unit: '', item: 'frozen bananas' },
      { amount: '1', unit: 'tbsp', item: 'peanut butter' }
    ],
    instructions: [
      'Blend frozen bananas and peanut butter in a food processor until smooth.',
      'Serve immediately or freeze for later.'
    ],
    totalMinutes: 5,
    difficulty: 'beginner',
    estimatedCost: 'budget',
    dietaryTags: ['soy-free'],
    emoji: '🍦'
  });

  // ---- Phase 5 recipe expansion ----
  [
  {
    "title": "Chickpea Flour Omelet",
    "description": "A savory egg-free omelet-style pancake filled with vegetables.",
    "category": "Breakfast",
    "ingredients": [
      {
        "amount": 1,
        "unit": "cup",
        "item": "chickpea flour"
      },
      {
        "amount": 1,
        "unit": "cup",
        "item": "water"
      },
      {
        "amount": 2,
        "unit": "tbsp",
        "item": "nutritional yeast"
      },
      {
        "amount": 0.5,
        "unit": "tsp",
        "item": "baking powder"
      },
      {
        "amount": 0.5,
        "unit": "tsp",
        "item": "salt"
      },
      {
        "amount": 1,
        "unit": "cup",
        "item": "chopped vegetables"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "oil"
      }
    ],
    "instructions": [
      "Whisk chickpea flour, water, nutritional yeast, baking powder and salt until smooth.",
      "Fold in the vegetables.",
      "Heat oil in a nonstick skillet over medium heat.",
      "Pour in the batter, cover and cook until set underneath.",
      "Flip carefully and cook until the center is firm."
    ],
    "totalMinutes": 20,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free",
      "tree-nut-free",
      "high-protein"
    ],
    "emoji": "🍳",
    "alternativeIds": [
      "alt-egg-cooking"
    ],
    "substitutionNotes": [
      "Use water-rich vegetables sparingly so the center sets."
    ],
    "storageNotes": "Refrigerate cooked portions up to 3 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Vegan Breakfast Burrito",
    "description": "A filling breakfast wrap with tofu, potatoes, beans and salsa.",
    "category": "Breakfast",
    "ingredients": [
      {
        "amount": 1,
        "unit": "block",
        "item": "firm tofu, drained"
      },
      {
        "amount": 2,
        "unit": "cups",
        "item": "diced cooked potatoes"
      },
      {
        "amount": 1,
        "unit": "cup",
        "item": "black beans, drained"
      },
      {
        "amount": 1,
        "unit": "cup",
        "item": "spinach"
      },
      {
        "amount": 4,
        "unit": "",
        "item": "large tortillas"
      },
      {
        "amount": 0.5,
        "unit": "cup",
        "item": "salsa"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "oil"
      }
    ],
    "instructions": [
      "Crumble tofu and cook in oil until lightly browned.",
      "Add potatoes, beans and spinach and heat through.",
      "Divide the filling among tortillas and add salsa.",
      "Fold the sides inward and roll tightly."
    ],
    "totalMinutes": 30,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "high-protein",
      "tree-nut-free"
    ],
    "emoji": "🌯",
    "alternativeIds": [
      "alt-egg-cooking",
      "alt-seitan-tempeh"
    ],
    "substitutionNotes": [
      "Use corn tortillas for a gluten-free version if large enough to roll."
    ],
    "storageNotes": "Refrigerate 3 days or freeze wrapped burritos.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Chia Breakfast Pudding",
    "description": "A make-ahead pudding made with plant milk and chia seeds.",
    "category": "Breakfast",
    "ingredients": [
      {
        "amount": 0.25,
        "unit": "cup",
        "item": "chia seeds"
      },
      {
        "amount": 1,
        "unit": "cup",
        "item": "plant milk"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "maple syrup"
      },
      {
        "amount": 0.5,
        "unit": "tsp",
        "item": "vanilla"
      },
      {
        "amount": 0.5,
        "unit": "cup",
        "item": "fruit"
      }
    ],
    "instructions": [
      "Stir chia seeds, plant milk, maple syrup and vanilla together.",
      "Rest 10 minutes, stir again to prevent clumps, then cover.",
      "Refrigerate at least 4 hours or overnight.",
      "Top with fruit before serving."
    ],
    "totalMinutes": 245,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "gluten-free",
      "soy-free"
    ],
    "emoji": "🥣",
    "alternativeIds": [
      "alt-plant-milk"
    ],
    "substitutionNotes": [
      "Choose a fortified plant milk if desired; allergens vary by base."
    ],
    "storageNotes": "Refrigerate up to 4 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Banana Oatmeal",
    "description": "Creamy oatmeal naturally sweetened with banana.",
    "category": "Breakfast",
    "ingredients": [
      {
        "amount": 1,
        "unit": "cup",
        "item": "rolled oats"
      },
      {
        "amount": 2,
        "unit": "cups",
        "item": "plant milk or water"
      },
      {
        "amount": 1,
        "unit": "",
        "item": "ripe banana, mashed"
      },
      {
        "amount": 0.5,
        "unit": "tsp",
        "item": "cinnamon"
      },
      {
        "amount": 2,
        "unit": "tbsp",
        "item": "seeds or nut butter"
      }
    ],
    "instructions": [
      "Combine oats, liquid, banana and cinnamon in a saucepan.",
      "Simmer over medium-low heat, stirring, until thickened.",
      "Top with seeds or nut butter."
    ],
    "totalMinutes": 10,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free"
    ],
    "emoji": "🍌",
    "alternativeIds": [
      "alt-plant-milk"
    ],
    "substitutionNotes": [
      "Use certified gluten-free oats when required."
    ],
    "storageNotes": "Refrigerate up to 4 days; add liquid when reheating.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Plant-Based Breakfast Sandwich",
    "description": "A savory breakfast sandwich with tofu, greens and an optional plant-based patty.",
    "category": "Breakfast",
    "ingredients": [
      {
        "amount": 4,
        "unit": "slices",
        "item": "firm tofu"
      },
      {
        "amount": 2,
        "unit": "",
        "item": "English muffins"
      },
      {
        "amount": 1,
        "unit": "cup",
        "item": "spinach"
      },
      {
        "amount": 2,
        "unit": "slices",
        "item": "plant-based cheese, optional"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "oil"
      },
      {
        "amount": 0.5,
        "unit": "tsp",
        "item": "turmeric and black pepper"
      }
    ],
    "instructions": [
      "Pat tofu dry and season with turmeric, pepper and salt.",
      "Pan-sear tofu in oil until golden on both sides.",
      "Wilt spinach in the same pan.",
      "Assemble on toasted muffins with optional plant cheese."
    ],
    "totalMinutes": 15,
    "difficulty": "beginner",
    "estimatedCost": "moderate",
    "dietaryTags": [
      "high-protein"
    ],
    "emoji": "🥪",
    "alternativeIds": [
      "alt-egg-cooking",
      "alt-plant-cheese"
    ],
    "substitutionNotes": [
      "Check muffins and cheese for allergens and current vegan labeling."
    ],
    "storageNotes": "Best assembled fresh; cooked tofu keeps 3 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Homemade Oat Milk",
    "description": "A simple oat beverage for cereal, smoothies and cold drinks.",
    "category": "Basics",
    "ingredients": [
      {
        "amount": 1,
        "unit": "cup",
        "item": "rolled oats"
      },
      {
        "amount": 4,
        "unit": "cups",
        "item": "cold water"
      },
      {
        "amount": 1,
        "unit": "pinch",
        "item": "salt"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "maple syrup, optional"
      }
    ],
    "instructions": [
      "Blend oats and cold water for about 30 seconds; over-blending can make it slimy.",
      "Strain through a fine mesh bag without excessive squeezing.",
      "Stir in salt and optional maple syrup.",
      "Chill before using and shake before pouring."
    ],
    "totalMinutes": 10,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free",
      "tree-nut-free"
    ],
    "emoji": "🥛",
    "alternativeIds": [
      "alt-oat-milk",
      "alt-plant-milk"
    ],
    "substitutionNotes": [
      "Homemade oat milk is not nutritionally equivalent to fortified commercial milk and is not ideal for every baking recipe."
    ],
    "storageNotes": "Refrigerate in a clean sealed container and use within 3 to 4 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Cashew Cream",
    "description": "A versatile creamy base for sauces, soups and dressings.",
    "category": "Basics",
    "ingredients": [
      {
        "amount": 1,
        "unit": "cup",
        "item": "raw cashews"
      },
      {
        "amount": 0.75,
        "unit": "cup",
        "item": "water"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "lemon juice"
      },
      {
        "amount": 0.5,
        "unit": "tsp",
        "item": "salt"
      }
    ],
    "instructions": [
      "Soak cashews in hot water for 20 minutes, then drain.",
      "Blend with fresh water, lemon juice and salt until completely smooth.",
      "Add water gradually for a thinner consistency."
    ],
    "totalMinutes": 25,
    "difficulty": "beginner",
    "estimatedCost": "moderate",
    "dietaryTags": [
      "soy-free",
      "gluten-free"
    ],
    "emoji": "🥜",
    "alternativeIds": [
      "alt-plant-cheese"
    ],
    "substitutionNotes": [
      "For a nut-free version, blend silken tofu or soaked sunflower seeds and adjust liquid."
    ],
    "storageNotes": "Refrigerate up to 5 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Sunflower Seed Cream",
    "description": "A nut-free creamy base for dressings and sauces.",
    "category": "Basics",
    "ingredients": [
      {
        "amount": 1,
        "unit": "cup",
        "item": "raw sunflower seeds"
      },
      {
        "amount": 0.75,
        "unit": "cup",
        "item": "water"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "lemon juice"
      },
      {
        "amount": 0.5,
        "unit": "tsp",
        "item": "salt"
      }
    ],
    "instructions": [
      "Soak sunflower seeds in hot water for 30 minutes and drain.",
      "Blend with fresh water, lemon juice and salt until smooth.",
      "Adjust water and seasoning for the intended use."
    ],
    "totalMinutes": 35,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "tree-nut-free",
      "soy-free",
      "gluten-free"
    ],
    "emoji": "🌻",
    "alternativeIds": [
      "alt-plant-cheese"
    ],
    "substitutionNotes": [
      "The flavor is more pronounced than cashew cream; garlic or herbs work well in savory dishes."
    ],
    "storageNotes": "Refrigerate up to 4 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Tofu Ricotta",
    "description": "A savory tofu filling for lasagna, pasta shells and toast.",
    "category": "Basics",
    "ingredients": [
      {
        "amount": 1,
        "unit": "block",
        "item": "firm tofu, drained"
      },
      {
        "amount": 2,
        "unit": "tbsp",
        "item": "nutritional yeast"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "lemon juice"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "olive oil"
      },
      {
        "amount": 1,
        "unit": "clove",
        "item": "garlic"
      },
      {
        "amount": 0.5,
        "unit": "tsp",
        "item": "salt"
      },
      {
        "amount": 0.25,
        "unit": "cup",
        "item": "fresh basil, optional"
      }
    ],
    "instructions": [
      "Pulse all ingredients in a food processor until crumbly but combined.",
      "Taste and adjust lemon, salt and herbs.",
      "Use as a filling or spread."
    ],
    "totalMinutes": 10,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "tree-nut-free",
      "high-protein"
    ],
    "emoji": "🧀",
    "alternativeIds": [
      "alt-plant-cheese"
    ],
    "substitutionNotes": [
      "For soy-free ricotta, use a white-bean or sunflower-seed base."
    ],
    "storageNotes": "Refrigerate up to 4 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Quick Vegan Cheese Sauce",
    "description": "A creamy potato and carrot sauce for pasta, nachos and vegetables.",
    "category": "Sauce",
    "ingredients": [
      {
        "amount": 2,
        "unit": "cups",
        "item": "diced potatoes"
      },
      {
        "amount": 1,
        "unit": "cup",
        "item": "sliced carrots"
      },
      {
        "amount": 0.5,
        "unit": "cup",
        "item": "cooking water"
      },
      {
        "amount": 0.25,
        "unit": "cup",
        "item": "nutritional yeast"
      },
      {
        "amount": 2,
        "unit": "tbsp",
        "item": "lemon juice"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "mustard"
      },
      {
        "amount": 0.5,
        "unit": "tsp",
        "item": "garlic powder"
      }
    ],
    "instructions": [
      "Boil potatoes and carrots until very tender.",
      "Reserve cooking water and drain.",
      "Blend vegetables with remaining ingredients until smooth.",
      "Add more water as needed and warm gently."
    ],
    "totalMinutes": 25,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free",
      "tree-nut-free",
      "gluten-free"
    ],
    "emoji": "🫕",
    "alternativeIds": [
      "alt-plant-cheese"
    ],
    "substitutionNotes": [
      "Add soaked cashews for richness if nuts are acceptable."
    ],
    "storageNotes": "Refrigerate up to 5 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Aquafaba Mayonnaise",
    "description": "An egg-free mayonnaise-style emulsion using chickpea liquid.",
    "category": "Sauce",
    "ingredients": [
      {
        "amount": 0.25,
        "unit": "cup",
        "item": "aquafaba"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "mustard"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "lemon juice or vinegar"
      },
      {
        "amount": 0.75,
        "unit": "cup",
        "item": "neutral oil"
      },
      {
        "amount": 0.25,
        "unit": "tsp",
        "item": "salt"
      }
    ],
    "instructions": [
      "Blend aquafaba, mustard, acid and salt with an immersion blender.",
      "With the blender running, add oil slowly until thick and emulsified.",
      "Taste and adjust salt or acid."
    ],
    "totalMinutes": 10,
    "difficulty": "intermediate",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free",
      "tree-nut-free"
    ],
    "emoji": "🥄",
    "alternativeIds": [
      "alt-vegan-mayo",
      "alt-egg-baking"
    ],
    "substitutionNotes": [
      "Emulsions can break; ingredients at similar temperatures improve reliability."
    ],
    "storageNotes": "Refrigerate promptly and use within 4 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Flax Egg",
    "description": "A simple binder for muffins, pancakes and cookies.",
    "category": "Basics",
    "ingredients": [
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "ground flaxseed"
      },
      {
        "amount": 3,
        "unit": "tbsp",
        "item": "water"
      }
    ],
    "instructions": [
      "Mix ground flaxseed and water.",
      "Rest 10 minutes until thickened.",
      "Use in a recipe that calls for one egg primarily for binding."
    ],
    "totalMinutes": 10,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free",
      "tree-nut-free",
      "gluten-free"
    ],
    "emoji": "🥚",
    "alternativeIds": [
      "alt-egg-baking"
    ],
    "substitutionNotes": [
      "Not suitable for recipes relying heavily on whipped egg structure."
    ],
    "storageNotes": "Mix immediately before use.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Lentil Taco Filling",
    "description": "A seasoned lentil filling for tacos, burritos and bowls.",
    "category": "Dinner",
    "ingredients": [
      {
        "amount": 2,
        "unit": "cups",
        "item": "cooked lentils"
      },
      {
        "amount": 0.5,
        "unit": "",
        "item": "onion, diced"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "oil"
      },
      {
        "amount": 2,
        "unit": "tbsp",
        "item": "tomato paste"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "chili powder"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "cumin"
      },
      {
        "amount": 0.5,
        "unit": "cup",
        "item": "water"
      }
    ],
    "instructions": [
      "Cook onion in oil until softened.",
      "Add tomato paste and spices and cook one minute.",
      "Stir in lentils and water.",
      "Simmer until thick enough for tacos."
    ],
    "totalMinutes": 20,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free",
      "tree-nut-free",
      "high-protein"
    ],
    "emoji": "🌮",
    "alternativeIds": [
      "alt-legume-meat"
    ],
    "substitutionNotes": [
      "Black beans or crumbled tofu can replace lentils."
    ],
    "storageNotes": "Refrigerate 4 days or freeze up to 3 months.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Walnut Lentil Taco Meat",
    "description": "A textured taco filling made from lentils and walnuts.",
    "category": "Dinner",
    "ingredients": [
      {
        "amount": 1.5,
        "unit": "cups",
        "item": "cooked lentils"
      },
      {
        "amount": 1,
        "unit": "cup",
        "item": "walnuts"
      },
      {
        "amount": 0.5,
        "unit": "",
        "item": "onion"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "oil"
      },
      {
        "amount": 2,
        "unit": "tsp",
        "item": "taco seasoning"
      },
      {
        "amount": 0.25,
        "unit": "cup",
        "item": "water"
      }
    ],
    "instructions": [
      "Pulse walnuts briefly until crumbly, not powdered.",
      "Cook onion in oil until soft.",
      "Add lentils, walnuts, seasoning and water.",
      "Cook until heated and lightly browned."
    ],
    "totalMinutes": 20,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free",
      "high-protein"
    ],
    "emoji": "🌮",
    "alternativeIds": [
      "alt-legume-meat"
    ],
    "substitutionNotes": [
      "Use sunflower seeds for a tree-nut-free version."
    ],
    "storageNotes": "Refrigerate up to 4 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Lentil Bolognese",
    "description": "A tomato pasta sauce with lentils replacing ground meat.",
    "category": "Dinner",
    "ingredients": [
      {
        "amount": 2,
        "unit": "cups",
        "item": "cooked lentils"
      },
      {
        "amount": 1,
        "unit": "",
        "item": "onion, diced"
      },
      {
        "amount": 1,
        "unit": "",
        "item": "carrot, diced"
      },
      {
        "amount": 2,
        "unit": "cloves",
        "item": "garlic"
      },
      {
        "amount": 28,
        "unit": "oz",
        "item": "crushed tomatoes"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "Italian seasoning"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "olive oil"
      }
    ],
    "instructions": [
      "Cook onion and carrot in oil until softened.",
      "Add garlic and seasoning and cook briefly.",
      "Stir in tomatoes and lentils.",
      "Simmer uncovered for 20 minutes and serve with pasta."
    ],
    "totalMinutes": 35,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free",
      "tree-nut-free",
      "high-protein"
    ],
    "emoji": "🍝",
    "alternativeIds": [
      "alt-legume-meat"
    ],
    "substitutionNotes": [
      "Use gluten-free pasta when required."
    ],
    "storageNotes": "Refrigerate 4 days or freeze up to 3 months.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Three-Bean Chili",
    "description": "A budget-friendly one-pot chili.",
    "category": "Dinner",
    "ingredients": [
      {
        "amount": 3,
        "unit": "cans",
        "item": "beans, drained"
      },
      {
        "amount": 28,
        "unit": "oz",
        "item": "crushed tomatoes"
      },
      {
        "amount": 1,
        "unit": "",
        "item": "onion, diced"
      },
      {
        "amount": 1,
        "unit": "",
        "item": "bell pepper, diced"
      },
      {
        "amount": 2,
        "unit": "tbsp",
        "item": "chili powder"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "cumin"
      },
      {
        "amount": 1,
        "unit": "cup",
        "item": "vegetable broth"
      }
    ],
    "instructions": [
      "Cook onion and pepper in a large pot until softened.",
      "Add spices and stir for 30 seconds.",
      "Add beans, tomatoes and broth.",
      "Simmer 25 minutes, stirring occasionally."
    ],
    "totalMinutes": 40,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free",
      "tree-nut-free",
      "high-protein"
    ],
    "emoji": "🌶️",
    "alternativeIds": [
      "alt-legume-meat"
    ],
    "substitutionNotes": [
      "Use any combination of beans you have."
    ],
    "storageNotes": "Refrigerate 5 days or freeze up to 3 months.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Tofu Vegetable Stir-Fry",
    "description": "Crisp tofu and vegetables in a quick savory sauce.",
    "category": "Dinner",
    "ingredients": [
      {
        "amount": 1,
        "unit": "block",
        "item": "extra-firm tofu"
      },
      {
        "amount": 4,
        "unit": "cups",
        "item": "mixed vegetables"
      },
      {
        "amount": 2,
        "unit": "tbsp",
        "item": "soy sauce or tamari"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "rice vinegar"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "maple syrup"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "cornstarch"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "oil"
      }
    ],
    "instructions": [
      "Press and cube tofu.",
      "Pan-cook tofu in oil until browned and remove.",
      "Cook vegetables until crisp-tender.",
      "Whisk sauce ingredients, return tofu and simmer until glossy."
    ],
    "totalMinutes": 30,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "high-protein",
      "tree-nut-free"
    ],
    "emoji": "🥦",
    "alternativeIds": [
      "alt-seitan-tempeh"
    ],
    "substitutionNotes": [
      "Use tamari for a gluten-free version; coconut aminos are soy-free but taste different."
    ],
    "storageNotes": "Refrigerate up to 4 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Sheet-Pan Tofu and Vegetables",
    "description": "A hands-off meal-prep dinner with roasted tofu and vegetables.",
    "category": "Dinner",
    "ingredients": [
      {
        "amount": 1,
        "unit": "block",
        "item": "extra-firm tofu, cubed"
      },
      {
        "amount": 5,
        "unit": "cups",
        "item": "chopped vegetables"
      },
      {
        "amount": 2,
        "unit": "tbsp",
        "item": "oil"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "soy sauce or tamari"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "smoked paprika"
      }
    ],
    "instructions": [
      "Heat oven to 425°F.",
      "Toss tofu and vegetables with oil, soy sauce and paprika.",
      "Spread on a sheet pan without crowding.",
      "Roast 25 to 30 minutes, turning once."
    ],
    "totalMinutes": 35,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "high-protein",
      "tree-nut-free"
    ],
    "emoji": "🍱",
    "alternativeIds": [
      "alt-seitan-tempeh"
    ],
    "substitutionNotes": [
      "Use vegetables with similar roasting times or cut dense vegetables smaller."
    ],
    "storageNotes": "Refrigerate up to 4 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Mushroom Walnut Ground",
    "description": "A savory crumble for pasta, tacos or stuffed vegetables.",
    "category": "Dinner",
    "ingredients": [
      {
        "amount": 16,
        "unit": "oz",
        "item": "mushrooms"
      },
      {
        "amount": 1,
        "unit": "cup",
        "item": "walnuts"
      },
      {
        "amount": 0.5,
        "unit": "",
        "item": "onion"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "soy sauce or tamari"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "smoked paprika"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "oil"
      }
    ],
    "instructions": [
      "Pulse mushrooms and walnuts separately until finely chopped.",
      "Cook onion in oil until soft.",
      "Add mushrooms and cook until their moisture evaporates.",
      "Add walnuts and seasoning and cook until browned."
    ],
    "totalMinutes": 25,
    "difficulty": "intermediate",
    "estimatedCost": "moderate",
    "dietaryTags": [
      "soy-free"
    ],
    "emoji": "🍄",
    "alternativeIds": [
      "alt-legume-meat"
    ],
    "substitutionNotes": [
      "Use sunflower seeds instead of walnuts for a tree-nut-free version."
    ],
    "storageNotes": "Refrigerate up to 4 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Red Beans and Rice",
    "description": "A simple bean-and-rice meal with smoky seasoning.",
    "category": "Dinner",
    "ingredients": [
      {
        "amount": 3,
        "unit": "cups",
        "item": "cooked kidney beans"
      },
      {
        "amount": 3,
        "unit": "cups",
        "item": "cooked rice"
      },
      {
        "amount": 1,
        "unit": "",
        "item": "onion, diced"
      },
      {
        "amount": 1,
        "unit": "",
        "item": "bell pepper, diced"
      },
      {
        "amount": 2,
        "unit": "stalks",
        "item": "celery, diced"
      },
      {
        "amount": 2,
        "unit": "cloves",
        "item": "garlic"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "smoked paprika"
      },
      {
        "amount": 2,
        "unit": "cups",
        "item": "vegetable broth"
      }
    ],
    "instructions": [
      "Cook onion, pepper and celery until softened.",
      "Add garlic and spices and cook briefly.",
      "Add beans and broth and simmer 20 minutes.",
      "Mash some beans to thicken and serve over rice."
    ],
    "totalMinutes": 35,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free",
      "tree-nut-free",
      "high-protein"
    ],
    "emoji": "🍛",
    "alternativeIds": [
      "alt-legume-meat"
    ],
    "substitutionNotes": [
      "Check broth and seasoning blends for animal-derived flavoring."
    ],
    "storageNotes": "Refrigerate up to 5 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Creamy Mushroom Stroganoff",
    "description": "Mushrooms in a tangy plant-based cream sauce.",
    "category": "Dinner",
    "ingredients": [
      {
        "amount": 12,
        "unit": "oz",
        "item": "pasta"
      },
      {
        "amount": 16,
        "unit": "oz",
        "item": "mushrooms, sliced"
      },
      {
        "amount": 1,
        "unit": "",
        "item": "onion, diced"
      },
      {
        "amount": 2,
        "unit": "cloves",
        "item": "garlic"
      },
      {
        "amount": 1.5,
        "unit": "cups",
        "item": "vegetable broth"
      },
      {
        "amount": 0.75,
        "unit": "cup",
        "item": "cashew or sunflower cream"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "mustard"
      }
    ],
    "instructions": [
      "Cook pasta according to package directions.",
      "Brown mushrooms and onion in a wide pan.",
      "Add garlic and broth and simmer 5 minutes.",
      "Stir in cream and mustard without boiling hard.",
      "Combine with pasta and season to taste."
    ],
    "totalMinutes": 35,
    "difficulty": "intermediate",
    "estimatedCost": "moderate",
    "dietaryTags": [
      "soy-free"
    ],
    "emoji": "🍄",
    "alternativeIds": [
      "alt-plant-creamer",
      "alt-plant-cheese"
    ],
    "substitutionNotes": [
      "Use sunflower cream for a nut-free version."
    ],
    "storageNotes": "Refrigerate up to 4 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Vegan Mac and Cheese",
    "description": "Pasta coated in a creamy potato-carrot cheese-style sauce.",
    "category": "Dinner",
    "ingredients": [
      {
        "amount": 12,
        "unit": "oz",
        "item": "pasta"
      },
      {
        "amount": 2,
        "unit": "cups",
        "item": "diced potatoes"
      },
      {
        "amount": 1,
        "unit": "cup",
        "item": "sliced carrots"
      },
      {
        "amount": 0.5,
        "unit": "cup",
        "item": "plant milk"
      },
      {
        "amount": 0.25,
        "unit": "cup",
        "item": "nutritional yeast"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "lemon juice"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "mustard"
      }
    ],
    "instructions": [
      "Cook pasta and reserve some cooking water.",
      "Boil potatoes and carrots until very soft.",
      "Blend vegetables with plant milk, nutritional yeast, lemon and mustard.",
      "Combine sauce and pasta, thinning as needed."
    ],
    "totalMinutes": 30,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free",
      "tree-nut-free"
    ],
    "emoji": "🧀",
    "alternativeIds": [
      "alt-plant-cheese",
      "alt-plant-milk"
    ],
    "substitutionNotes": [
      "Use gluten-free pasta when required."
    ],
    "storageNotes": "Refrigerate up to 4 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Chickpea Pot Pie",
    "description": "Vegetables and chickpeas in a creamy filling under a biscuit or pastry topping.",
    "category": "Dinner",
    "ingredients": [
      {
        "amount": 2,
        "unit": "cups",
        "item": "cooked chickpeas"
      },
      {
        "amount": 3,
        "unit": "cups",
        "item": "mixed vegetables"
      },
      {
        "amount": 1,
        "unit": "",
        "item": "onion, diced"
      },
      {
        "amount": 2,
        "unit": "cups",
        "item": "vegetable broth"
      },
      {
        "amount": 1,
        "unit": "cup",
        "item": "plant milk"
      },
      {
        "amount": 3,
        "unit": "tbsp",
        "item": "flour"
      },
      {
        "amount": 1,
        "unit": "",
        "item": "vegan pastry or biscuit topping"
      }
    ],
    "instructions": [
      "Heat oven to 400°F.",
      "Cook onion and vegetables until beginning to soften.",
      "Stir in flour, then gradually add broth and plant milk.",
      "Add chickpeas and simmer until thick.",
      "Transfer to a baking dish, add topping and bake until browned and bubbling."
    ],
    "totalMinutes": 50,
    "difficulty": "intermediate",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free"
    ],
    "emoji": "🥧",
    "alternativeIds": [
      "alt-legume-meat",
      "alt-plant-milk"
    ],
    "substitutionNotes": [
      "Check pastry ingredients for butter, milk, egg and L-cysteine."
    ],
    "storageNotes": "Refrigerate up to 4 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Quinoa Chickpea Meal-Prep Bowls",
    "description": "Balanced bowls with quinoa, chickpeas, vegetables and lemon dressing.",
    "category": "Lunch",
    "ingredients": [
      {
        "amount": 3,
        "unit": "cups",
        "item": "cooked quinoa"
      },
      {
        "amount": 3,
        "unit": "cups",
        "item": "cooked chickpeas"
      },
      {
        "amount": 4,
        "unit": "cups",
        "item": "roasted or raw vegetables"
      },
      {
        "amount": 0.25,
        "unit": "cup",
        "item": "lemon juice"
      },
      {
        "amount": 3,
        "unit": "tbsp",
        "item": "olive oil"
      },
      {
        "amount": 2,
        "unit": "tbsp",
        "item": "tahini"
      }
    ],
    "instructions": [
      "Divide quinoa, chickpeas and vegetables among containers.",
      "Whisk lemon, oil, tahini, salt and water into a dressing.",
      "Store dressing separately and add before eating."
    ],
    "totalMinutes": 25,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free",
      "tree-nut-free",
      "high-protein"
    ],
    "emoji": "🥗",
    "alternativeIds": [
      "alt-legume-meat"
    ],
    "substitutionNotes": [
      "Use rice or another grain if quinoa is unavailable."
    ],
    "storageNotes": "Refrigerate up to 4 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Hummus Vegetable Wrap",
    "description": "A fast lunch wrap with hummus and crunchy vegetables.",
    "category": "Lunch",
    "ingredients": [
      {
        "amount": 4,
        "unit": "",
        "item": "large tortillas"
      },
      {
        "amount": 1,
        "unit": "cup",
        "item": "hummus"
      },
      {
        "amount": 3,
        "unit": "cups",
        "item": "sliced vegetables"
      },
      {
        "amount": 2,
        "unit": "cups",
        "item": "greens"
      },
      {
        "amount": 0.25,
        "unit": "cup",
        "item": "pickled onions, optional"
      }
    ],
    "instructions": [
      "Spread hummus across each tortilla.",
      "Add vegetables, greens and optional pickled onions.",
      "Fold in the sides and roll tightly."
    ],
    "totalMinutes": 10,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free",
      "tree-nut-free"
    ],
    "emoji": "🌯",
    "alternativeIds": [
      "alt-legume-meat"
    ],
    "substitutionNotes": [
      "Check tortillas and prepared hummus labels."
    ],
    "storageNotes": "Best assembled the day it is eaten.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "White Bean Sandwich Spread",
    "description": "A creamy, budget-friendly sandwich filling.",
    "category": "Lunch",
    "ingredients": [
      {
        "amount": 2,
        "unit": "cups",
        "item": "white beans, drained"
      },
      {
        "amount": 2,
        "unit": "tbsp",
        "item": "vegan mayonnaise or tahini"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "mustard"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "lemon juice"
      },
      {
        "amount": 0.25,
        "unit": "cup",
        "item": "diced celery"
      },
      {
        "amount": 2,
        "unit": "tbsp",
        "item": "diced pickles"
      }
    ],
    "instructions": [
      "Mash beans, leaving some texture.",
      "Stir in remaining ingredients.",
      "Season with salt and pepper and serve in sandwiches or wraps."
    ],
    "totalMinutes": 10,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free",
      "tree-nut-free",
      "high-protein"
    ],
    "emoji": "🥪",
    "alternativeIds": [
      "alt-legume-meat",
      "alt-vegan-mayo"
    ],
    "substitutionNotes": [
      "Tahini has a stronger flavor than mayonnaise and contains sesame."
    ],
    "storageNotes": "Refrigerate up to 4 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Lentil Vegetable Soup",
    "description": "A flexible soup made from lentils and pantry vegetables.",
    "category": "Lunch",
    "ingredients": [
      {
        "amount": 1.5,
        "unit": "cups",
        "item": "dry brown or green lentils"
      },
      {
        "amount": 1,
        "unit": "",
        "item": "onion, diced"
      },
      {
        "amount": 2,
        "unit": "",
        "item": "carrots, diced"
      },
      {
        "amount": 2,
        "unit": "stalks",
        "item": "celery, diced"
      },
      {
        "amount": 14,
        "unit": "oz",
        "item": "diced tomatoes"
      },
      {
        "amount": 6,
        "unit": "cups",
        "item": "vegetable broth"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "dried herbs"
      }
    ],
    "instructions": [
      "Rinse lentils.",
      "Cook onion, carrots and celery until softened.",
      "Add lentils, tomatoes, broth and herbs.",
      "Simmer 30 to 35 minutes until lentils are tender."
    ],
    "totalMinutes": 45,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free",
      "tree-nut-free",
      "high-protein"
    ],
    "emoji": "🍲",
    "alternativeIds": [
      "alt-legume-meat"
    ],
    "substitutionNotes": [
      "Red lentils cook faster and create a softer soup."
    ],
    "storageNotes": "Refrigerate 5 days or freeze up to 3 months.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Banana Blossom Fish-Style Fillets",
    "description": "Seasoned banana blossoms with a crisp coating for tacos or sandwiches.",
    "category": "Dinner",
    "ingredients": [
      {
        "amount": 1,
        "unit": "can",
        "item": "banana blossoms, drained"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "lemon juice"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "soy sauce or tamari"
      },
      {
        "amount": 0.5,
        "unit": "cup",
        "item": "flour"
      },
      {
        "amount": 0.5,
        "unit": "cup",
        "item": "plant milk"
      },
      {
        "amount": 1,
        "unit": "cup",
        "item": "breadcrumbs"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "seaweed flakes, optional"
      }
    ],
    "instructions": [
      "Pat banana blossoms dry and season with lemon, soy sauce and seaweed.",
      "Set up flour, plant milk and breadcrumbs in separate bowls.",
      "Coat each piece in flour, milk and breadcrumbs.",
      "Bake at 425°F until crisp, turning once, or shallow-fry carefully."
    ],
    "totalMinutes": 35,
    "difficulty": "intermediate",
    "estimatedCost": "moderate",
    "dietaryTags": [
      "soy-free"
    ],
    "emoji": "🐟",
    "alternativeIds": [
      "alt-plant-seafood",
      "alt-plant-milk"
    ],
    "substitutionNotes": [
      "Use tamari and gluten-free crumbs when required."
    ],
    "storageNotes": "Refrigerate cooked pieces up to 3 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Hearts of Palm Crabless Cakes",
    "description": "Tender vegetable cakes with coastal seasoning.",
    "category": "Dinner",
    "ingredients": [
      {
        "amount": 2,
        "unit": "cans",
        "item": "hearts of palm, drained"
      },
      {
        "amount": 1,
        "unit": "cup",
        "item": "chickpeas, drained"
      },
      {
        "amount": 0.5,
        "unit": "cup",
        "item": "breadcrumbs"
      },
      {
        "amount": 0.25,
        "unit": "cup",
        "item": "vegan mayonnaise"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "mustard"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "seaweed flakes"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "Old Bay-style seasoning"
      }
    ],
    "instructions": [
      "Roughly chop hearts of palm and mash chickpeas.",
      "Mix all ingredients and chill 15 minutes.",
      "Form patties.",
      "Pan-cook in a lightly oiled skillet until browned on both sides."
    ],
    "totalMinutes": 35,
    "difficulty": "intermediate",
    "estimatedCost": "moderate",
    "dietaryTags": [
      "soy-free",
      "tree-nut-free"
    ],
    "emoji": "🦀",
    "alternativeIds": [
      "alt-plant-seafood",
      "alt-vegan-mayo"
    ],
    "substitutionNotes": [
      "Seasoning blends can contain salt and ambiguous flavorings; check the label."
    ],
    "storageNotes": "Refrigerate up to 3 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Carrot Lox",
    "description": "Smoky marinated carrot ribbons for bagels and sandwiches.",
    "category": "Breakfast",
    "ingredients": [
      {
        "amount": 4,
        "unit": "",
        "item": "large carrots"
      },
      {
        "amount": 2,
        "unit": "tbsp",
        "item": "soy sauce or tamari"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "rice vinegar"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "liquid smoke"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "capers"
      },
      {
        "amount": 1,
        "unit": "sheet",
        "item": "nori, crumbled"
      }
    ],
    "instructions": [
      "Peel carrots into wide ribbons.",
      "Steam or simmer briefly until flexible but not mushy.",
      "Mix marinade ingredients and coat warm carrots.",
      "Chill at least 2 hours before serving."
    ],
    "totalMinutes": 140,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "tree-nut-free"
    ],
    "emoji": "🥕",
    "alternativeIds": [
      "alt-plant-seafood"
    ],
    "substitutionNotes": [
      "Use tamari for gluten-free preparation."
    ],
    "storageNotes": "Refrigerate up to 4 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Chickpea Tuna-Style Melt",
    "description": "A warm sandwich with chickpea salad and plant-based cheese.",
    "category": "Lunch",
    "ingredients": [
      {
        "amount": 2,
        "unit": "cups",
        "item": "chickpeas, drained"
      },
      {
        "amount": 0.25,
        "unit": "cup",
        "item": "vegan mayonnaise"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "mustard"
      },
      {
        "amount": 0.25,
        "unit": "cup",
        "item": "celery, diced"
      },
      {
        "amount": 4,
        "unit": "slices",
        "item": "bread"
      },
      {
        "amount": 4,
        "unit": "slices",
        "item": "plant-based cheese"
      }
    ],
    "instructions": [
      "Mash chickpeas and mix with mayonnaise, mustard and celery.",
      "Divide between bread slices and top with plant cheese.",
      "Toast in a covered skillet or oven until hot and the cheese softens."
    ],
    "totalMinutes": 15,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "tree-nut-free"
    ],
    "emoji": "🥪",
    "alternativeIds": [
      "alt-plant-seafood",
      "alt-vegan-mayo",
      "alt-plant-cheese"
    ],
    "substitutionNotes": [
      "Check bread, mayonnaise and cheese labels for allergens."
    ],
    "storageNotes": "Store filling up to 4 days; assemble before heating.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Silken Tofu Chocolate Pudding",
    "description": "A quick chocolate dessert blended from silken tofu.",
    "category": "Dessert",
    "ingredients": [
      {
        "amount": 12,
        "unit": "oz",
        "item": "silken tofu"
      },
      {
        "amount": 0.25,
        "unit": "cup",
        "item": "cocoa powder"
      },
      {
        "amount": 0.25,
        "unit": "cup",
        "item": "maple syrup"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "vanilla"
      },
      {
        "amount": 1,
        "unit": "pinch",
        "item": "salt"
      }
    ],
    "instructions": [
      "Blend all ingredients until completely smooth.",
      "Taste and adjust cocoa or sweetener.",
      "Chill at least one hour."
    ],
    "totalMinutes": 65,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "tree-nut-free",
      "high-protein"
    ],
    "emoji": "🍫",
    "alternativeIds": [
      "alt-plant-frozen-dessert"
    ],
    "substitutionNotes": [
      "Use an allergen-appropriate chocolate or cocoa product."
    ],
    "storageNotes": "Refrigerate up to 4 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Apple Oat Crumble",
    "description": "Warm fruit under a crisp oat topping.",
    "category": "Dessert",
    "ingredients": [
      {
        "amount": 6,
        "unit": "cups",
        "item": "sliced apples"
      },
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "lemon juice"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "cinnamon"
      },
      {
        "amount": 1,
        "unit": "cup",
        "item": "rolled oats"
      },
      {
        "amount": 0.5,
        "unit": "cup",
        "item": "flour"
      },
      {
        "amount": 0.33,
        "unit": "cup",
        "item": "brown sugar"
      },
      {
        "amount": 0.33,
        "unit": "cup",
        "item": "plant-based butter or neutral oil"
      }
    ],
    "instructions": [
      "Heat oven to 375°F.",
      "Toss apples with lemon and cinnamon in a baking dish.",
      "Mix oats, flour, sugar and fat until crumbly.",
      "Spread topping over apples and bake until bubbling and browned."
    ],
    "totalMinutes": 45,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free",
      "tree-nut-free"
    ],
    "emoji": "🍎",
    "alternativeIds": [
      "alt-plant-butter"
    ],
    "substitutionNotes": [
      "Use certified gluten-free oats and flour when required."
    ],
    "storageNotes": "Refrigerate up to 4 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Vegan Chocolate Chip Cookies",
    "description": "Soft cookies using a flax egg and plant-based butter.",
    "category": "Dessert",
    "ingredients": [
      {
        "amount": 1,
        "unit": "tbsp",
        "item": "ground flaxseed"
      },
      {
        "amount": 3,
        "unit": "tbsp",
        "item": "water"
      },
      {
        "amount": 0.5,
        "unit": "cup",
        "item": "plant-based butter"
      },
      {
        "amount": 0.75,
        "unit": "cup",
        "item": "brown sugar"
      },
      {
        "amount": 1.5,
        "unit": "cups",
        "item": "flour"
      },
      {
        "amount": 0.5,
        "unit": "tsp",
        "item": "baking soda"
      },
      {
        "amount": 0.75,
        "unit": "cup",
        "item": "vegan chocolate chips"
      }
    ],
    "instructions": [
      "Heat oven to 350°F and line a baking sheet.",
      "Mix flaxseed and water and rest 10 minutes.",
      "Cream plant butter and sugar, then mix in flax gel.",
      "Fold in flour, baking soda and chocolate chips.",
      "Scoop and bake until edges are set, about 10 to 12 minutes."
    ],
    "totalMinutes": 30,
    "difficulty": "beginner",
    "estimatedCost": "moderate",
    "dietaryTags": [
      "tree-nut-free"
    ],
    "emoji": "🍪",
    "alternativeIds": [
      "alt-egg-baking",
      "alt-plant-butter"
    ],
    "substitutionNotes": [
      "Check chocolate chips and plant butter for current vegan labeling."
    ],
    "storageNotes": "Store airtight for 3 days or freeze dough portions.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Fudgy Black Bean Brownies",
    "description": "Chocolate brownies made with blended black beans.",
    "category": "Dessert",
    "ingredients": [
      {
        "amount": 1,
        "unit": "can",
        "item": "black beans, rinsed"
      },
      {
        "amount": 0.5,
        "unit": "cup",
        "item": "oats"
      },
      {
        "amount": 0.33,
        "unit": "cup",
        "item": "cocoa powder"
      },
      {
        "amount": 0.5,
        "unit": "cup",
        "item": "maple syrup"
      },
      {
        "amount": 0.25,
        "unit": "cup",
        "item": "neutral oil or nut butter"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "baking powder"
      },
      {
        "amount": 0.5,
        "unit": "cup",
        "item": "vegan chocolate chips"
      }
    ],
    "instructions": [
      "Heat oven to 350°F and line an 8-inch pan.",
      "Blend all ingredients except chocolate chips until smooth.",
      "Fold in chips and spread into the pan.",
      "Bake until the center is just set, about 22 to 28 minutes.",
      "Cool fully before slicing."
    ],
    "totalMinutes": 40,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free"
    ],
    "emoji": "🍫",
    "alternativeIds": [
      "alt-egg-baking",
      "alt-legume-meat"
    ],
    "substitutionNotes": [
      "Use certified gluten-free oats when required; texture differs from flour brownies."
    ],
    "storageNotes": "Refrigerate up to 5 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Coconut Rice Pudding",
    "description": "A creamy stovetop dessert without dairy.",
    "category": "Dessert",
    "ingredients": [
      {
        "amount": 3,
        "unit": "cups",
        "item": "cooked rice"
      },
      {
        "amount": 1,
        "unit": "can",
        "item": "coconut milk"
      },
      {
        "amount": 1,
        "unit": "cup",
        "item": "plant milk"
      },
      {
        "amount": 0.25,
        "unit": "cup",
        "item": "sugar"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "vanilla"
      },
      {
        "amount": 0.5,
        "unit": "tsp",
        "item": "cinnamon"
      }
    ],
    "instructions": [
      "Combine all ingredients in a saucepan.",
      "Simmer gently, stirring often, until creamy.",
      "Serve warm or chill before serving."
    ],
    "totalMinutes": 25,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free",
      "gluten-free"
    ],
    "emoji": "🍚",
    "alternativeIds": [
      "alt-plant-milk"
    ],
    "substitutionNotes": [
      "Coconut is a major ingredient and may not suit every allergy need."
    ],
    "storageNotes": "Refrigerate up to 4 days.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Strawberry Nice Cream",
    "description": "A fruit-based frozen dessert made from bananas and strawberries.",
    "category": "Dessert",
    "ingredients": [
      {
        "amount": 3,
        "unit": "",
        "item": "frozen bananas"
      },
      {
        "amount": 2,
        "unit": "cups",
        "item": "frozen strawberries"
      },
      {
        "amount": 0.25,
        "unit": "cup",
        "item": "plant milk"
      },
      {
        "amount": 1,
        "unit": "tsp",
        "item": "lemon juice"
      }
    ],
    "instructions": [
      "Blend frozen fruit, plant milk and lemon, stopping to scrape the bowl.",
      "Serve soft immediately or freeze briefly for a firmer texture."
    ],
    "totalMinutes": 10,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free",
      "tree-nut-free",
      "gluten-free"
    ],
    "emoji": "🍓",
    "alternativeIds": [
      "alt-plant-frozen-dessert",
      "alt-plant-milk"
    ],
    "substitutionNotes": [
      "Use only enough liquid to keep the mixture moving."
    ],
    "storageNotes": "Best fresh; frozen leftovers become firmer and need thawing.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  },
  {
    "title": "Maple Mustard Dressing",
    "description": "A quick honey-free dressing for salads and bowls.",
    "category": "Sauce",
    "ingredients": [
      {
        "amount": 2,
        "unit": "tbsp",
        "item": "maple syrup"
      },
      {
        "amount": 2,
        "unit": "tbsp",
        "item": "mustard"
      },
      {
        "amount": 2,
        "unit": "tbsp",
        "item": "apple cider vinegar"
      },
      {
        "amount": 0.25,
        "unit": "cup",
        "item": "olive oil"
      },
      {
        "amount": 1,
        "unit": "pinch",
        "item": "salt and pepper"
      }
    ],
    "instructions": [
      "Whisk maple syrup, mustard and vinegar.",
      "Slowly whisk in oil until combined.",
      "Season to taste."
    ],
    "totalMinutes": 5,
    "difficulty": "beginner",
    "estimatedCost": "budget",
    "dietaryTags": [
      "soy-free",
      "tree-nut-free",
      "gluten-free"
    ],
    "emoji": "🥗",
    "alternativeIds": [
      "alt-liquid-sweeteners"
    ],
    "substitutionNotes": [
      "Agave or date syrup can replace maple with a different flavor."
    ],
    "storageNotes": "Refrigerate up to 7 days and shake before using.",
    "testingStatus": "needs-kitchen-test",
    "needsResearch": false
  }
].forEach(addRecipe);
  // ---- External Resources Library ----
  const resources = [
  {
    "id": "resource-dominion",
    "title": "Dominion",
    "creator": "Farm Transparency Project",
    "category": "Documentaries",
    "format": "Free documentary",
    "description": "A feature-length investigation of animal use across food, clothing, entertainment and research, filmed primarily in Australia.",
    "url": "https://www.dominionmovement.com/watch",
    "emoji": "🎬",
    "free": true,
    "featured": true,
    "graphic": true,
    "contentWarning": "Graphic footage of animal suffering and killing. Consider your emotional state, use the chapter list, pause when needed, and do not show it to others without informed consent.",
    "tags": [
      "ethics",
      "animal agriculture",
      "food",
      "clothing",
      "entertainment",
      "research"
    ],
    "verifiedDate": "2026-08-20"
  },
  {
    "id": "resource-earthlings",
    "title": "Earthlings",
    "creator": "Nation Earth",
    "category": "Documentaries",
    "format": "Documentary",
    "description": "An earlier documentary examining human dependence on animals across several industries.",
    "url": "https://www.nationearth.com/",
    "emoji": "🎬",
    "free": false,
    "featured": false,
    "graphic": true,
    "contentWarning": "Contains prolonged graphic footage of animal suffering and killing.",
    "tags": [
      "ethics",
      "animal rights",
      "industry"
    ],
    "verifiedDate": "2026-08-20"
  },
  {
    "id": "resource-cowspiracy",
    "title": "Cowspiracy",
    "creator": "A.U.M. Films",
    "category": "Documentaries",
    "format": "Documentary",
    "description": "Explores animal agriculture through an environmental lens. Treat individual statistics as starting points and compare them with current primary research.",
    "url": "https://www.cowspiracy.com/",
    "emoji": "🎬",
    "free": false,
    "featured": false,
    "graphic": false,
    "contentWarning": "Discusses environmental destruction and animal agriculture; some viewers may find portions upsetting.",
    "tags": [
      "environment",
      "climate",
      "agriculture"
    ],
    "verifiedDate": "2026-08-20"
  },
  {
    "id": "resource-vegan-society-guide",
    "title": "How to Go Vegan",
    "creator": "The Vegan Society",
    "category": "Getting Started",
    "format": "Online guide",
    "description": "Practical transition guidance covering motivation, food, labels, clothing and maintaining the change.",
    "url": "https://www.vegansociety.com/go-vegan/how-go-vegan",
    "emoji": "🧭",
    "free": true,
    "featured": true,
    "graphic": false,
    "contentWarning": "",
    "tags": [
      "beginner",
      "transition",
      "shopping",
      "lifestyle"
    ],
    "verifiedDate": "2026-08-20"
  },
  {
    "id": "resource-pcrm-starter-kit",
    "title": "Vegan Starter Kit",
    "creator": "Physicians Committee for Responsible Medicine",
    "category": "Getting Started",
    "format": "Guide and book",
    "description": "An introductory resource with meal planning, nutrition, restaurant and life-stage guidance.",
    "url": "https://www.pcrm.org/veganstarterkit",
    "emoji": "📘",
    "free": true,
    "featured": true,
    "graphic": false,
    "contentWarning": "Health information is educational and does not replace individualized medical care.",
    "tags": [
      "beginner",
      "nutrition",
      "meal planning",
      "recipes"
    ],
    "verifiedDate": "2026-08-20"
  },
  {
    "id": "resource-vegan-starter-book",
    "title": "The Vegan Starter Kit",
    "creator": "Neal D. Barnard, MD",
    "category": "Books",
    "format": "Book",
    "description": "A concise practical introduction to vegan meals, nutrition, eating out, travel and common questions.",
    "url": "https://www.pcrm.org/theveganstarterkit",
    "emoji": "📚",
    "free": false,
    "featured": false,
    "graphic": false,
    "contentWarning": "Health information is educational and does not replace individualized medical care.",
    "tags": [
      "beginner",
      "nutrition",
      "recipes"
    ],
    "verifiedDate": "2026-08-20"
  },
  {
    "id": "resource-animal-liberation-now",
    "title": "Animal Liberation Now",
    "creator": "Peter Singer",
    "category": "Books",
    "format": "Book",
    "description": "A contemporary revision of Singer’s influential philosophical argument about animal suffering and equal consideration.",
    "url": "https://www.harpercollins.com/products/animal-liberation-now-peter-singer",
    "emoji": "📚",
    "free": false,
    "featured": false,
    "graphic": false,
    "contentWarning": "Discusses animal experimentation, farming and suffering in detail.",
    "tags": [
      "ethics",
      "philosophy",
      "animal rights"
    ],
    "verifiedDate": "2026-08-20"
  },
  {
    "id": "resource-why-we-love-dogs",
    "title": "Why We Love Dogs, Eat Pigs, and Wear Cows",
    "creator": "Melanie Joy, PhD",
    "category": "Books",
    "format": "Book",
    "description": "Introduces the psychology of carnism and examines how cultural norms shape relationships with animals.",
    "url": "https://carnism.org/book/why-we-love-dogs-eat-pigs-and-wear-cows/",
    "emoji": "📚",
    "free": false,
    "featured": false,
    "graphic": false,
    "contentWarning": "Discusses animal exploitation and may include distressing descriptions.",
    "tags": [
      "psychology",
      "carnism",
      "ethics",
      "culture"
    ],
    "verifiedDate": "2026-08-20"
  },
  {
    "id": "resource-nih-b12",
    "title": "Vitamin B12 Fact Sheet",
    "creator": "NIH Office of Dietary Supplements",
    "category": "Nutrition",
    "format": "Evidence reference",
    "description": "A detailed reference on B12 functions, recommended amounts, food sources, deficiency, testing and medication interactions.",
    "url": "https://ods.od.nih.gov/factsheets/VitaminB12-Consumer/",
    "emoji": "🧬",
    "free": true,
    "featured": true,
    "graphic": false,
    "contentWarning": "For personal dosing, deficiency concerns or symptoms, consult a qualified clinician.",
    "tags": [
      "b12",
      "supplements",
      "deficiency",
      "health"
    ],
    "verifiedDate": "2026-08-20"
  },
  {
    "id": "resource-vegan-society-nutrition",
    "title": "Nutrition Overview",
    "creator": "The Vegan Society",
    "category": "Nutrition",
    "format": "Online guide",
    "description": "Vegan-specific planning guidance covering balanced meals and nutrients that deserve deliberate attention.",
    "url": "https://www.vegansociety.com/resources/nutrition-and-health/nutrition-overview",
    "emoji": "🥗",
    "free": true,
    "featured": false,
    "graphic": false,
    "contentWarning": "General education does not replace individualized dietetic or medical advice.",
    "tags": [
      "nutrition",
      "b12",
      "iodine",
      "calcium",
      "protein"
    ],
    "verifiedDate": "2026-08-20"
  },
  {
    "id": "resource-owid-food-impact",
    "title": "Environmental Impacts of Food Production",
    "creator": "Our World in Data",
    "category": "Environment",
    "format": "Research explainer and charts",
    "description": "A data-rich overview of food-related emissions, land use, water use and pollution with links to underlying research.",
    "url": "https://ourworldindata.org/environmental-impacts-of-food",
    "emoji": "🌍",
    "free": true,
    "featured": true,
    "graphic": false,
    "contentWarning": "",
    "tags": [
      "climate",
      "land use",
      "water",
      "emissions",
      "agriculture"
    ],
    "verifiedDate": "2026-08-20"
  },
  {
    "id": "resource-food-footprints",
    "title": "Food Footprints Data Explorer",
    "creator": "Our World in Data",
    "category": "Environment",
    "format": "Interactive data explorer",
    "description": "Compare greenhouse-gas, land-use and water footprints across foods and production stages.",
    "url": "https://ourworldindata.org/explorers/food-footprints",
    "emoji": "📊",
    "free": true,
    "featured": false,
    "graphic": false,
    "contentWarning": "Data are population-level estimates and do not describe every individual farm or product.",
    "tags": [
      "data",
      "climate",
      "land use",
      "water",
      "comparison"
    ],
    "verifiedDate": "2026-08-20"
  },
  {
    "id": "resource-ted-melanie-joy",
    "title": "Toward Rational, Authentic Food Choices",
    "creator": "Melanie Joy",
    "category": "Videos",
    "format": "Talk",
    "description": "A psychology-focused talk about how belief systems and social conditioning influence food choices.",
    "url": "https://www.youtube.com/watch?v=o0VrZPBskpg",
    "emoji": "▶️",
    "free": true,
    "featured": false,
    "graphic": false,
    "contentWarning": "Discusses animal agriculture; preview before sharing with younger audiences.",
    "tags": [
      "psychology",
      "carnism",
      "food choices",
      "talk"
    ],
    "verifiedDate": "2026-08-20"
  },
  {
    "id": "resource-our-hen-house",
    "title": "Our Hen House",
    "creator": "Jasmin Singer and team",
    "category": "Podcasts",
    "format": "Podcast and media hub",
    "description": "Interviews, news and commentary focused on animal rights and changing the world for animals.",
    "url": "https://www.ourhenhouse.org/",
    "emoji": "🎧",
    "free": true,
    "featured": false,
    "graphic": false,
    "contentWarning": "Episodes vary and may discuss animal cruelty or upsetting current events.",
    "tags": [
      "podcast",
      "animal rights",
      "interviews",
      "news"
    ],
    "verifiedDate": "2026-08-20"
  },
  {
    "id": "resource-farm-sanctuary",
    "title": "Farm Sanctuary",
    "creator": "Farm Sanctuary",
    "category": "Organizations",
    "format": "Education and advocacy organization",
    "description": "Animal sanctuary, education and advocacy resources centered on farmed animals and food-system change.",
    "url": "https://www.farmsanctuary.org/",
    "emoji": "🐮",
    "free": true,
    "featured": false,
    "graphic": false,
    "contentWarning": "Some advocacy pages may describe or depict animal cruelty.",
    "tags": [
      "sanctuary",
      "farmed animals",
      "advocacy",
      "education"
    ],
    "verifiedDate": "2026-08-20"
  },
  {
    "id": "resource-animal-ethics",
    "title": "Animal Ethics",
    "creator": "Animal Ethics",
    "category": "Ethics",
    "format": "Educational organization",
    "description": "Accessible material on speciesism, sentience, animal interests and ethical arguments concerning human and wild-animal suffering.",
    "url": "https://www.animal-ethics.org/",
    "emoji": "⚖️",
    "free": true,
    "featured": false,
    "graphic": false,
    "contentWarning": "Some pages discuss severe animal suffering.",
    "tags": [
      "ethics",
      "speciesism",
      "sentience",
      "philosophy"
    ],
    "verifiedDate": "2026-08-20"
  }
];

  // ---- Learn Articles ----
  const learnArticles = [
  {
    "id": "learn-why-vegan",
    "title": "Why choose veganism?",
    "category": "Foundations",
    "content": "<p>Veganism seeks to avoid animal exploitation as far as practicable. People may also be motivated by environmental, cultural, economic or health considerations. Your reason can be personal, and it can evolve.</p><p>A useful first step is to identify the foods and products you use most often, then choose replacements that work for your budget, access and routine.</p>",
    "sourceIds": [
      "source-vegan-society"
    ],
    "needsResearch": false
  },
  {
    "id": "learn-getting-started",
    "title": "A gradual, practical start",
    "category": "Getting Started",
    "content": "<p>Begin with repeatable changes: choose a plant milk, learn two breakfasts, two lunches and three dinners, then replace household items as they run out. You do not need to discard usable possessions.</p><ul><li>Week 1: breakfast and drinks</li><li>Week 2: lunches and snacks</li><li>Week 3: dinners</li><li>Week 4: review nutrition and non-food products</li></ul><p>Keep notes on taste, price and availability so the changes become routine.</p>",
    "sourceIds": [],
    "needsResearch": false
  },
  {
    "id": "learn-first-grocery-trip",
    "title": "Your first vegan grocery trip",
    "category": "Shopping",
    "content": "<p>Build the cart around familiar staples: beans or lentils, tofu or tempeh, whole grains, vegetables, fruit, nuts or seeds, and a fortified plant milk. Add convenience foods if they help you sustain the change.</p><p>Check allergens, fortification and serving size. Compare unit prices, and recheck labels even on products you have bought before because formulations can change.</p>",
    "sourceIds": [
      "src-fda-allergen-labels"
    ],
    "needsResearch": false
  },
  {
    "id": "learn-label-reading",
    "title": "How to read a food label",
    "category": "Shopping",
    "content": "<p>Start with the ingredient list and the “Contains” statement. In the United States, milk, egg, fish and crustacean shellfish are among the nine major allergens that must be declared when present; this helps but does not identify every animal-derived ingredient.</p><p>“May contain” statements are voluntary cross-contact advisories, not ingredient declarations. Terms such as “non-dairy,” “plant-based” or “natural flavors” are not by themselves proof that a product is vegan. When an ambiguous ingredient matters, contact the manufacturer and record the date.</p>",
    "sourceIds": [
      "src-fda-allergen-labels",
      "source-fda"
    ],
    "needsResearch": false
  },
  {
    "id": "learn-ingredient-status",
    "title": "Use evidence levels, not guesses",
    "category": "Shopping",
    "content": "<p>Treat ingredients as <strong>animal-derived</strong>, <strong>plant or synthetic</strong>, or <strong>source-variable</strong>. A source-variable ingredient cannot be classified from its name alone.</p><p>Product-level confirmation is stronger than assumptions about one ingredient. Prefer a current vegan certification or a dated manufacturer statement, and recheck after packaging or formulation changes.</p>",
    "sourceIds": [
      "source-fda"
    ],
    "needsResearch": false
  },
  {
    "id": "learn-balanced-meals",
    "title": "Build a balanced vegan meal",
    "category": "Nutrition",
    "content": "<p>A practical template is: a protein-rich food, a grain or starchy vegetable, vegetables or fruit, and a source of unsaturated fat. Rotate foods rather than relying on one “superfood.”</p><p>Fortified foods can be important. Check labels because calcium, vitamin D and B12 content varies. Energy needs and nutrient needs differ by age, activity, pregnancy, medications and health conditions.</p>",
    "sourceIds": [
      "src-dga-2020-2025"
    ],
    "needsResearch": false
  },
  {
    "id": "learn-nutrition-basics",
    "title": "Nutrition priorities",
    "category": "Nutrition",
    "content": "<p>Plan reliable vitamin B12 intake. Also pay attention to iron, calcium, vitamin D, iodine, omega-3 fats, zinc, selenium, choline, protein and total energy. The Nutrition section explains food sources and absorption issues for each.</p><p>Children, pregnant or breastfeeding people, older adults, athletes, and anyone with a medical condition or restricted diet should seek individualized guidance from a qualified clinician or registered dietitian.</p>",
    "sourceIds": [
      "src-nih-b12",
      "src-nih-iron",
      "src-nih-calcium",
      "src-nih-vitamin-d",
      "src-nih-iodine",
      "src-nih-omega3",
      "src-nih-zinc",
      "src-nih-selenium",
      "src-nih-choline"
    ],
    "needsResearch": false
  },
  {
    "id": "learn-b12-plan",
    "title": "Vitamin B12 needs a plan",
    "category": "Nutrition",
    "content": "<p>Unfortified plant foods are not a dependable source of vitamin B12. Use fortified foods or a supplement that supplies a reliable amount, and follow professional advice for dose and testing.</p><p>Deficiency can affect blood and the nervous system, and symptoms can take time to appear. Some medicines and digestive conditions affect absorption, so personalized care matters.</p>",
    "sourceIds": [
      "src-nih-b12"
    ],
    "needsResearch": false
  },
  {
    "id": "learn-protein",
    "title": "Getting enough protein",
    "category": "Nutrition",
    "content": "<p>Include protein-rich foods through the day: beans, lentils, peas, tofu, tempeh, soy milk, seitan, nuts and seeds. Variety supplies all essential amino acids; most people do not need to combine specific proteins at every meal.</p><p>Needs increase in some circumstances, including growth, pregnancy and intense training. Seitan is unsuitable for people with celiac disease or wheat allergy.</p>",
    "sourceIds": [
      "src-dga-2020-2025"
    ],
    "needsResearch": false
  },
  {
    "id": "learn-iron-calcium",
    "title": "Iron and calcium: absorption matters",
    "category": "Nutrition",
    "content": "<p>Plant iron is nonheme iron. Pair iron-rich foods such as lentils, beans, tofu or fortified cereal with vitamin-C-rich foods. Tea and coffee with a meal can reduce nonheme iron absorption.</p><p>For calcium, use fortified plant milks, calcium-set tofu and lower-oxalate greens. Shake fortified beverages before pouring. Do not self-treat suspected deficiency with high-dose supplements.</p>",
    "sourceIds": [
      "src-nih-iron",
      "src-nih-calcium"
    ],
    "needsResearch": false
  },
  {
    "id": "learn-budget-vegan",
    "title": "Vegan eating on a budget",
    "category": "Lifestyle",
    "content": "<p>Center meals on low-cost staples: dried or canned beans, lentils, oats, rice, pasta, potatoes, frozen vegetables, peanut butter and seasonal produce. Store brands and bulk purchases can reduce unit cost when you will use the food.</p><p>Plan meals around what you already have, freeze leftovers, and treat specialty substitutes as optional conveniences rather than necessities.</p>",
    "sourceIds": [],
    "needsResearch": false
  },
  {
    "id": "learn-eating-out",
    "title": "Eating at restaurants",
    "category": "Lifestyle",
    "content": "<p>Check the current menu before going and ask specific questions: Is it cooked with butter, meat stock, fish sauce, egg, cheese or honey? Is shared-fryer or grill cross-contact relevant to your needs?</p><p>For allergies, clearly identify the allergen and ask about preparation; a “vegan” label does not guarantee freedom from cross-contact.</p>",
    "sourceIds": [
      "src-fda-allergen-labels"
    ],
    "needsResearch": false
  },
  {
    "id": "learn-allergies-cross-contact",
    "title": "Allergies and cross-contact",
    "category": "Safety",
    "content": "<p>Vegan status and allergen safety are different questions. A vegan food may contain soy, wheat, peanuts, tree nuts or sesame, and a food without animal ingredients may share equipment with milk or egg.</p><p>Read the full label every time. People with food allergies should follow their clinician’s emergency plan and contact the manufacturer when labeling is unclear.</p>",
    "sourceIds": [
      "src-fda-allergen-labels"
    ],
    "needsResearch": false
  },
  {
    "id": "learn-medication-health",
    "title": "Medications and medically necessary care",
    "category": "Health",
    "content": "<p>Do not stop, delay or alter prescribed treatment because an ingredient may be animal-derived or because animal testing was involved. Ask a pharmacist or prescriber whether a suitable alternative formulation exists.</p><p>Inactive ingredients and capsule materials can vary by manufacturer and strength. Confirm the exact product; never substitute medication without professional approval.</p>",
    "sourceIds": [],
    "needsResearch": false
  },
  {
    "id": "learn-clothing",
    "title": "Clothing and material checks",
    "category": "Non-food",
    "content": "<p>Check fiber and component labels for leather, suede, wool, cashmere, silk, fur, down, feathers, shell, horn and bone. Shoes and bags may combine several materials, and adhesives are not always disclosed.</p><p>Use what you already own if that fits your values, replace items when needed, and ask brands for a component-level statement rather than relying only on “synthetic” marketing.</p>",
    "sourceIds": [],
    "needsResearch": false
  },
  {
    "id": "learn-cosmetics",
    "title": "Cosmetics: ingredients and testing",
    "category": "Non-food",
    "content": "<p>“Vegan” generally addresses ingredients; “cruelty-free” generally addresses animal-testing policy. One claim does not automatically establish the other.</p><p>Look for clear, current brand policies or independent certification, including how suppliers and markets are handled. Reconfirm individual shades and formulas because ingredients can differ.</p>",
    "sourceIds": [],
    "needsResearch": false
  },
  {
    "id": "learn-social",
    "title": "Family, travel and social situations",
    "category": "Lifestyle",
    "content": "<p>Lead with a clear, friendly request and offer an easy solution: bring a dish, suggest a restaurant, or share a short shopping list. Pack a shelf-stable snack for travel.</p><p>Focus on choices you control. A flexible plan for imperfect situations is more useful than skipping meals or risking a medical need.</p>",
    "sourceIds": [],
    "needsResearch": false
  },
  {
    "id": "learn-common-mistakes",
    "title": "Common beginner mistakes",
    "category": "Getting Started",
    "content": "<ul><li>Relying on “plant-based” wording without reading the label</li><li>Forgetting a reliable B12 source</li><li>Eating too little total food after removing calorie-dense products</li><li>Replacing every food with expensive specialty products</li><li>Assuming vegan means allergen-safe or nutritionally complete</li><li>Trying to change food, clothing and every household product in one day</li></ul><p>Review what is working after two weeks and adjust one problem at a time.</p>",
    "sourceIds": [
      "src-nih-b12",
      "src-fda-allergen-labels"
    ],
    "needsResearch": false
  }
];


  // ---- Alternatives ----
  const alternatives = [
    { id:'alt-plant-milk', name:'Plant milk', category:'Dairy alternative', description:'Soy, oat, pea, almond and other plant beverages used in drinks, cereal and cooking.', replaces:'Dairy milk', animalIds:['animal-cattle','animal-sheep','animal-goat'], useIds:['use-dairy'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Many fortified options are available'], limitations:['Nutrition and allergens vary; compare labels'], priceTier:'budget', sourceIds:[], needsResearch:true },
    { id:'alt-oat-milk', name:'Oat milk', category:'Dairy alternative', description:'An oat-based beverage used in drinks, cereal and cooking.', replaces:'Dairy milk', animalIds:['animal-cattle'], useIds:['use-dairy'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Widely available'], limitations:['Check gluten and cross-contact labeling when relevant'], priceTier:'budget', sourceIds:[], needsResearch:true },
    { id:'alt-soy-milk', name:'Soy milk', category:'Dairy alternative', description:'A soy-based beverage used in drinks, cereal and cooking.', replaces:'Dairy milk', animalIds:['animal-cattle'], useIds:['use-dairy'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Widely available'], limitations:['Contains soy'], priceTier:'budget', sourceIds:[], needsResearch:true },
    { id:'alt-plant-cheese', name:'Plant-based cheese', category:'Dairy alternative', description:'Cheese-style products made from ingredients such as nuts, soy, starches or plant oils.', replaces:'Dairy cheese', animalIds:['animal-cattle','animal-sheep','animal-goat'], useIds:['use-dairy'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Available in slices, shreds, spreads and blocks'], limitations:['Melting, flavor, allergens and nutrition vary'], priceTier:'moderate', sourceIds:[], needsResearch:true },
    { id:'alt-legume-meat', name:'Beans, lentils and legume-based swaps', category:'Meat alternative', description:'Legumes can replace ground or chopped meat in tacos, chili, patties, soups and fillings.', replaces:'Ground or chopped meat', animalIds:['animal-cattle','animal-pig','animal-sheep','animal-goat','animal-rabbit'], useIds:['use-beef','use-pork','use-small-ruminant-meat','use-rabbit-meat'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:['recipe-black-bean-burger','recipe-chickpea-curry'], advantages:['Budget-friendly','Shelf-stable options'], limitations:['Not a one-to-one substitute in every recipe'], priceTier:'budget', sourceIds:[], needsResearch:true },
    { id:'alt-seitan-tempeh', name:'Seitan, tofu and tempeh', category:'Meat alternative', description:'Versatile protein foods that can be sliced, crumbled, marinated or breaded for savory dishes.', replaces:'Poultry, pork or other meat', animalIds:['animal-pig','animal-chicken','animal-turkey','animal-duck-goose'], useIds:['use-pork','use-poultry'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:['recipe-tofu-scramble'], advantages:['Adaptable to many flavors and textures'], limitations:['Seitan contains wheat; tofu and tempeh contain soy'], priceTier:'budget', sourceIds:[], needsResearch:true },
    { id:'alt-egg-cooking', name:'Tofu or chickpea-flour egg dishes', category:'Egg alternative', description:'Tofu and chickpea flour can make scramble- or omelet-style savory dishes.', replaces:'Eggs in breakfast dishes', animalIds:['animal-chicken','animal-duck-goose'], useIds:['use-eggs'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:['recipe-tofu-scramble'], advantages:['Useful for savory meals'], limitations:['Does not perform like egg in every baking recipe'], priceTier:'budget', sourceIds:[], needsResearch:true },
    { id:'alt-egg-baking', name:'Flax, chia, fruit purée or commercial egg replacer', category:'Egg alternative', description:'Recipe-dependent binders and moisture replacements for some baked goods.', replaces:'Eggs in baking', animalIds:['animal-chicken'], useIds:['use-eggs'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Several pantry options'], limitations:['No single substitute duplicates every egg function; choose by recipe'], priceTier:'budget', sourceIds:[], needsResearch:true },
    { id:'alt-plant-seafood', name:'Plant-based seafood alternatives', category:'Seafood alternative', description:'Tofu, hearts of palm, banana blossom, legumes and commercial products can replace seafood in selected dishes.', replaces:'Fish or shellfish', animalIds:['animal-fish','animal-shellfish'], useIds:['use-fishing-aquaculture'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Options for tacos, sandwiches, cakes and fried dishes'], limitations:['Nutrition and allergens vary; seaweed adds flavor but not identical nutrition'], priceTier:'moderate', sourceIds:[], needsResearch:true },
    { id:'alt-algae-omega3', name:'Algae-derived omega-3', category:'Supplement alternative', description:'Algae-derived products provide a non-fish source of DHA and/or EPA depending on formulation.', replaces:'Fish-oil supplements', animalIds:['animal-fish'], useIds:['use-fishing-aquaculture'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Direct non-fish option'], limitations:['Check dose and seek medical advice when appropriate'], priceTier:'premium', sourceIds:[], needsResearch:true },
    { id:'alt-liquid-sweeteners', name:'Maple, date or agave syrup', category:'Honey alternative', description:'Plant-derived liquid sweeteners that can replace honey in many drinks, dressings and baked goods.', replaces:'Honey', animalIds:['animal-bees'], useIds:['use-beekeeping'], ingredientIds:['ingredient-honey'], relatedProductIds:[], relatedRecipeIds:[], advantages:['Widely available'], limitations:['Flavor, sweetness and baking behavior differ'], priceTier:'moderate', sourceIds:[], needsResearch:true },
    { id:'alt-plant-waxes', name:'Soy, candelilla, carnauba or rice-bran wax', category:'Wax alternative', description:'Plant-derived waxes used in selected candles, cosmetics, coatings and polishes.', replaces:'Beeswax', animalIds:['animal-bees'], useIds:['use-beekeeping'], ingredientIds:['ingredient-beeswax'], relatedProductIds:[], relatedRecipeIds:[], advantages:['Multiple functional options'], limitations:['Melting point and texture differ by wax and application'], priceTier:'moderate', sourceIds:[], needsResearch:true },
    { id:'alt-nonleather-materials', name:'Canvas, cork, microfiber and verified plant composites', category:'Leather alternative', description:'Non-animal materials used for shoes, bags, belts, upholstery and accessories.', replaces:'Leather and suede', animalIds:['animal-cattle','animal-pig','animal-sheep','animal-goat'], useIds:['use-leather'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Options across many price points'], limitations:['Durability, plastic content and environmental impacts vary'], priceTier:'moderate', sourceIds:[], needsResearch:true },
    { id:'alt-nonwool-fibers', name:'Cotton, hemp, linen, lyocell and recycled fibers', category:'Wool alternative', description:'Plant-derived and recycled fibers used for clothing, blankets and textiles.', replaces:'Wool, cashmere and mohair', animalIds:['animal-sheep','animal-goat'], useIds:['use-wool'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Many textures and weights available'], limitations:['Warmth, moisture behavior and environmental impacts vary'], priceTier:'moderate', sourceIds:[], needsResearch:true },
    { id:'alt-synthetic-insulation', name:'Recycled synthetic, kapok or cellulose fill', category:'Down alternative', description:'Non-animal fillings used in jackets, bedding, pillows and sleeping bags.', replaces:'Down and feathers', animalIds:['animal-chicken','animal-turkey','animal-duck-goose'], useIds:['use-feathers-down'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Available for apparel and bedding'], limitations:['Warmth-to-weight and care requirements vary'], priceTier:'moderate', sourceIds:[], needsResearch:true },
    { id:'alt-nonfur-materials', name:'Faux fur, fleece and textile pile', category:'Fur alternative', description:'Textile materials used to imitate fur texture or provide warmth without animal pelts.', replaces:'Fur', animalIds:['animal-rabbit','animal-mink','animal-fox','animal-raccoon-dog','animal-chinchilla'], useIds:['use-fur'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Widely available'], limitations:['Many faux-fur products contain synthetic plastic fibers'], priceTier:'moderate', sourceIds:[], needsResearch:true },
    { id:'alt-nonsilk-fibers', name:'Lyocell, cupro and satin-weave alternatives', category:'Silk alternative', description:'Non-animal fibers and fabrics selected for drape, sheen or softness.', replaces:'Silk', animalIds:['animal-silkworm'], useIds:['use-silk'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Available in clothing and bedding'], limitations:['“Satin” describes a weave and may be made from different fibers; check composition'], priceTier:'moderate', sourceIds:[], needsResearch:true },
    { id:'alt-noninsect-red-colors', name:'Beet, anthocyanin or lycopene-based colors', category:'Colorant alternative', description:'Non-insect red or pink color options used in some foods and cosmetics.', replaces:'Carmine or cochineal extract', animalIds:['animal-cochineal'], useIds:['use-carmine'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Animal-free options exist'], limitations:['Color stability, shade and permitted uses vary; verify the specific product'], priceTier:'moderate', sourceIds:['src-fda-carmine-labeling'], needsResearch:true },
    { id:'alt-plant-gelling', name:'Agar, pectin and carrageenan', category:'Gelatin alternative', description:'Plant- or algae-derived gelling agents used in recipe-specific applications.', replaces:'Gelatin', animalIds:['animal-cattle','animal-pig'], useIds:['use-gelatin-rendering'], ingredientIds:['ingredient-gelatin'], relatedProductIds:[], relatedRecipeIds:[], advantages:['Useful in desserts, jams and gels'], limitations:['Each sets differently and is not always a direct one-to-one substitution'], priceTier:'budget', sourceIds:[], needsResearch:true },
    { id:'alt-non-animal-research', name:'Non-animal research and testing methods', category:'Research alternative', description:'A category including in vitro systems, computational models and other replacement approaches within the 3Rs framework.', replaces:'Some animal use in research or testing', animalIds:['animal-laboratory','animal-rabbit','animal-pig','animal-fish','animal-dog','animal-cat','animal-research-rodents','animal-nonhuman-primate'], useIds:['use-research-testing'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Can replace animal use for suitable questions and methods'], limitations:['Applicability and regulatory acceptance depend on the scientific or testing context'], priceTier:'unknown', sourceIds:['src-usda-three-rs'], needsResearch:false },
    { id:'alt-adoption-rescue', name:'Shelter or rescue adoption', category:'Companion-animal alternative', description:'Adopting or responsibly rehoming an animal instead of purchasing from commercial breeding channels.', replaces:'Commercial companion-animal purchase', animalIds:['animal-dog','animal-cat','animal-rabbit','animal-chinchilla','animal-horse-donkey'], useIds:['use-companionship','use-breeding-pet-trade'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Provides a home to an existing animal'], limitations:['Still creates a long-term care obligation; suitability and support needs vary'], priceTier:'unknown', sourceIds:[], needsResearch:true },
    { id:'alt-animal-free-entertainment', name:'Animal-free entertainment and education', category:'Entertainment alternative', description:'Performances, exhibits, documentaries, simulations and educational experiences that do not require live-animal display or performance.', replaces:'Some animal exhibitions or performances', animalIds:['animal-dog','animal-cat','animal-rabbit','animal-horse-donkey','animal-nonhuman-primate'], useIds:['use-entertainment'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Avoids live-animal transport, training and confinement for the experience'], limitations:['Does not replace every conservation or rehabilitation function claimed by particular institutions'], priceTier:'unknown', sourceIds:[], needsResearch:true },
    { id:'alt-mechanical-transport', name:'Mechanical or human-powered transport', category:'Working-animal alternative', description:'Bicycles, carts, small vehicles and other locally appropriate systems that can replace some animal transport or traction tasks.', replaces:'Some draft, pack or riding work', animalIds:['animal-horse-donkey'], useIds:['use-work-transport'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Can reduce animal workload where infrastructure and resources permit'], limitations:['Cost, terrain, fuel, maintenance and local access determine suitability'], priceTier:'unknown', sourceIds:['src-fao-draft-animals-nigeria'], needsResearch:true },
    { id:'alt-nonlethal-wildlife-management', name:'Nonlethal wildlife-conflict prevention', category:'Wildlife-management alternative', description:'Preventive approaches such as securing food attractants, livestock-protection practices, exclusion, fladry and carefully applied hazing.', replaces:'Some lethal coyote-control situations', animalIds:['animal-coyote'], useIds:['use-wildlife-conflict-control'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['May prevent or reduce conflicts without killing animals'], limitations:['Effectiveness depends on context; persistent animals may overcome deterrents and professional guidance may be needed'], priceTier:'unknown', sourceIds:['src-usda-coyote-fladry'], needsResearch:false },
    { id:'alt-commercial-plant-meat', name:'Commercial plant-based meat', category:'Meat alternative', description:'Packaged plant-based burgers, grounds, poultry-style products, sausages, deli slices and seafood-style products.', replaces:'Commercial meat products', animalIds:['animal-cattle','animal-pig','animal-chicken','animal-turkey','animal-fish','animal-shellfish'], useIds:['use-beef','use-pork','use-poultry','use-fishing-aquaculture'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Convenient','Many familiar formats'], limitations:['Ingredients, allergens, nutrition, price and current vegan status vary by product'], priceTier:'premium', sourceIds:[], needsResearch:true },
    { id:'alt-plant-creamer', name:'Plant-based coffee creamer', category:'Dairy alternative', description:'Oat, almond, soy, coconut and other plant-based creamers for coffee and beverages.', replaces:'Dairy coffee creamer', animalIds:['animal-cattle'], useIds:['use-dairy'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Multiple flavors and bases'], limitations:['Sugar, allergens and performance vary'], priceTier:'moderate', sourceIds:[], needsResearch:true },
    { id:'alt-plant-butter', name:'Plant-based butter and spread', category:'Dairy alternative', description:'Plant-oil spreads and cultured plant butters used for spreading, cooking and selected baking applications.', replaces:'Dairy butter', animalIds:['animal-cattle'], useIds:['use-dairy'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Widely available'], limitations:['Water content, salt and baking performance vary'], priceTier:'moderate', sourceIds:[], needsResearch:true },
    { id:'alt-plant-yogurt', name:'Plant-based yogurt', category:'Dairy alternative', description:'Cultured soy, oat, almond, coconut and other plant-based yogurt alternatives.', replaces:'Dairy yogurt', animalIds:['animal-cattle','animal-goat','animal-sheep'], useIds:['use-dairy'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Multiple bases and flavors'], limitations:['Protein, fortification, sugar and allergens vary'], priceTier:'moderate', sourceIds:[], needsResearch:true },
    { id:'alt-plant-frozen-dessert', name:'Plant-based frozen dessert', category:'Dairy alternative', description:'Frozen desserts based on oats, soy, coconut, cashews, almonds, bananas and other plant ingredients.', replaces:'Dairy ice cream or gelato', animalIds:['animal-cattle'], useIds:['use-dairy'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Commercial and homemade options'], limitations:['Allergens, sugar, fat and texture vary'], priceTier:'moderate', sourceIds:[], needsResearch:true },
    { id:'alt-vegan-mayo', name:'Egg-free mayonnaise-style spread', category:'Egg alternative', description:'Mayonnaise-style spreads formulated without egg.', replaces:'Egg mayonnaise', animalIds:['animal-chicken'], useIds:['use-eggs'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Direct sandwich, dressing and sauce use'], limitations:['Ingredients and allergens vary'], priceTier:'moderate', sourceIds:[], needsResearch:true },
    { id:'alt-commercial-egg', name:'Commercial plant-based egg', category:'Egg alternative', description:'Packaged liquid, folded or prepared plant-based products designed for savory egg-style meals.', replaces:'Chicken eggs in selected dishes', animalIds:['animal-chicken'], useIds:['use-eggs'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Convenient for breakfast dishes'], limitations:['Not interchangeable with egg in every baking or cooking function'], priceTier:'premium', sourceIds:[], needsResearch:true },
    { id:'alt-vegan-prepared-meals', name:'Vegan prepared meals', category:'Convenience alternative', description:'Prepared meals and pizzas formulated without animal-derived meat, dairy or egg ingredients.', replaces:'Animal-based convenience meals', animalIds:['animal-cattle','animal-pig','animal-chicken'], useIds:['use-beef','use-pork','use-poultry','use-dairy','use-eggs'], ingredientIds:[], relatedProductIds:[], relatedRecipeIds:[], advantages:['Convenient and familiar formats'], limitations:['Current formulation and vegan status must be checked product by product'], priceTier:'premium', sourceIds:[], needsResearch:true }
  ];

  // ---- Everyday Items ----
  const everydayItems = [
  {
    "id": "item-milk",
    "name": "Dairy milk",
    "emoji": "🥛",
    "description": "Milk from cattle, goats or sheep.",
    "locationIds": [
      "loc-kitchen"
    ],
    "category": "Food",
    "animalIds": [
      "animal-cattle",
      "animal-goat",
      "animal-sheep"
    ],
    "ingredientIds": [
      "ingredient-casein",
      "ingredient-whey",
      "ingredient-lactose",
      "ingredient-milk-fat"
    ],
    "useIds": [
      "use-dairy"
    ],
    "alternativeIds": [
      "alt-plant-milk",
      "alt-oat-milk",
      "alt-soy-milk"
    ],
    "sourceIds": [],
    "verificationAdvice": "Choose a plant milk suited to drinking, cooking or baking.",
    "needsResearch": true
  },
  {
    "id": "item-cheese",
    "name": "Cheese",
    "emoji": "🧀",
    "description": "Dairy cheese made from animal milk.",
    "locationIds": [
      "loc-kitchen"
    ],
    "category": "Food",
    "animalIds": [
      "animal-cattle",
      "animal-goat",
      "animal-sheep"
    ],
    "ingredientIds": [
      "ingredient-casein",
      "ingredient-whey",
      "ingredient-lactose"
    ],
    "useIds": [
      "use-dairy"
    ],
    "alternativeIds": [
      "alt-plant-cheese"
    ],
    "sourceIds": [],
    "verificationAdvice": "Check plant-based cheese labels for allergens.",
    "needsResearch": true
  },
  {
    "id": "item-butter",
    "name": "Butter and dairy spreads",
    "emoji": "🧈",
    "description": "Traditional butter is concentrated dairy fat.",
    "locationIds": [
      "loc-kitchen"
    ],
    "category": "Food",
    "animalIds": [
      "animal-cattle"
    ],
    "ingredientIds": [
      "ingredient-milk-fat"
    ],
    "useIds": [
      "use-dairy"
    ],
    "alternativeIds": [],
    "sourceIds": [],
    "verificationAdvice": "Look for products explicitly labeled vegan rather than only “plant-based.”",
    "needsResearch": true
  },
  {
    "id": "item-yogurt",
    "name": "Yogurt",
    "emoji": "🥣",
    "description": "Traditional yogurt is cultured animal milk.",
    "locationIds": [
      "loc-kitchen"
    ],
    "category": "Food",
    "animalIds": [
      "animal-cattle"
    ],
    "ingredientIds": [
      "ingredient-casein",
      "ingredient-whey",
      "ingredient-lactose"
    ],
    "useIds": [
      "use-dairy"
    ],
    "alternativeIds": [
      "alt-plant-milk"
    ],
    "sourceIds": [],
    "verificationAdvice": "Plant yogurts vary in protein, fortification and allergens.",
    "needsResearch": true
  },
  {
    "id": "item-ice-cream",
    "name": "Ice cream and frozen desserts",
    "emoji": "🍨",
    "description": "Conventional ice cream contains dairy; some colors or mix-ins can add other animal-derived ingredients.",
    "locationIds": [
      "loc-kitchen"
    ],
    "category": "Food",
    "animalIds": [
      "animal-cattle",
      "animal-cochineal"
    ],
    "ingredientIds": [
      "ingredient-casein",
      "ingredient-whey",
      "ingredient-lactose",
      "ingredient-milk-fat",
      "ingredient-carmine"
    ],
    "useIds": [
      "use-dairy",
      "use-carmine"
    ],
    "alternativeIds": [
      "alt-plant-milk",
      "alt-noninsect-red-colors"
    ],
    "sourceIds": [
      "src-fda-carmine-labeling"
    ],
    "verificationAdvice": "Check the full ingredient list, including colors and mix-ins.",
    "needsResearch": false
  },
  {
    "id": "item-eggs",
    "name": "Eggs and liquid egg",
    "emoji": "🥚",
    "description": "Whole shell eggs and processed egg ingredients.",
    "locationIds": [
      "loc-kitchen"
    ],
    "category": "Food",
    "animalIds": [
      "animal-chicken",
      "animal-duck-goose"
    ],
    "ingredientIds": [
      "ingredient-albumen",
      "ingredient-egg-yolk",
      "ingredient-lysozyme"
    ],
    "useIds": [
      "use-eggs"
    ],
    "alternativeIds": [
      "alt-egg-cooking",
      "alt-egg-baking"
    ],
    "sourceIds": [],
    "verificationAdvice": "Choose the substitute according to whether the egg provides flavor, binding, lift or structure.",
    "needsResearch": true
  },
  {
    "id": "item-meat",
    "name": "Fresh and processed meat",
    "emoji": "🥩",
    "description": "Meat products from mammals, birds or aquatic animals.",
    "locationIds": [
      "loc-kitchen"
    ],
    "category": "Food",
    "animalIds": [
      "animal-cattle",
      "animal-pig",
      "animal-chicken",
      "animal-turkey",
      "animal-sheep",
      "animal-goat",
      "animal-fish",
      "animal-shellfish"
    ],
    "ingredientIds": [],
    "useIds": [
      "use-beef",
      "use-pork",
      "use-poultry",
      "use-small-ruminant-meat",
      "use-fishing-aquaculture"
    ],
    "alternativeIds": [
      "alt-legume-meat",
      "alt-seitan-tempeh",
      "alt-plant-seafood"
    ],
    "sourceIds": [],
    "verificationAdvice": "Match the alternative to the cooking method and allergen needs.",
    "needsResearch": true
  },
  {
    "id": "item-gelatin-candy",
    "name": "Gummy candy and marshmallows",
    "emoji": "🍬",
    "description": "Some gummy candies and marshmallows use gelatin; confectionery can also contain shellac, beeswax, dairy or carmine.",
    "locationIds": [
      "loc-kitchen"
    ],
    "category": "Food",
    "animalIds": [
      "animal-cattle",
      "animal-pig",
      "animal-bees",
      "animal-cochineal"
    ],
    "ingredientIds": [
      "ingredient-gelatin",
      "ingredient-shellac",
      "ingredient-beeswax",
      "ingredient-carmine"
    ],
    "useIds": [
      "use-gelatin-rendering",
      "use-beekeeping",
      "use-carmine"
    ],
    "alternativeIds": [
      "alt-plant-gelling",
      "alt-plant-waxes",
      "alt-noninsect-red-colors"
    ],
    "sourceIds": [],
    "verificationAdvice": "Look for gelatin-free or explicitly vegan labeling.",
    "needsResearch": true
  },
  {
    "id": "item-baked-goods",
    "name": "Packaged baked goods",
    "emoji": "🧁",
    "description": "Bread, pastries and desserts may contain milk, eggs, butter, whey, casein, mono- and diglycerides, enzymes or L-cysteine.",
    "locationIds": [
      "loc-kitchen"
    ],
    "category": "Food",
    "animalIds": [
      "animal-cattle",
      "animal-chicken",
      "animal-duck-goose"
    ],
    "ingredientIds": [
      "ingredient-casein",
      "ingredient-whey",
      "ingredient-milk-fat",
      "ingredient-albumen",
      "ingredient-egg-yolk",
      "ingredient-mono-diglycerides",
      "ingredient-enzymes",
      "ingredient-l-cysteine"
    ],
    "useIds": [
      "use-dairy",
      "use-eggs"
    ],
    "alternativeIds": [
      "alt-egg-baking"
    ],
    "sourceIds": [],
    "verificationAdvice": "Ambiguous ingredients require manufacturer verification.",
    "needsResearch": true
  },
  {
    "id": "item-honey",
    "name": "Honey",
    "emoji": "🍯",
    "description": "A sweet substance made and stored by honey bees.",
    "locationIds": [
      "loc-kitchen"
    ],
    "category": "Food",
    "animalIds": [
      "animal-bees"
    ],
    "ingredientIds": [
      "ingredient-honey"
    ],
    "useIds": [
      "use-beekeeping"
    ],
    "alternativeIds": [
      "alt-liquid-sweeteners"
    ],
    "sourceIds": [],
    "verificationAdvice": "Maple, date and agave syrups differ in sweetness and behavior.",
    "needsResearch": true
  },
  {
    "id": "item-wine-beer",
    "name": "Wine and beer",
    "emoji": "🍷",
    "description": "Some alcoholic drinks may be clarified using isinglass, gelatin, casein or egg-derived fining agents, which may not remain as listed ingredients.",
    "locationIds": [
      "loc-kitchen"
    ],
    "category": "Drink",
    "animalIds": [
      "animal-fish",
      "animal-cattle",
      "animal-pig",
      "animal-chicken"
    ],
    "ingredientIds": [
      "ingredient-isinglass",
      "ingredient-gelatin",
      "ingredient-casein",
      "ingredient-albumen"
    ],
    "useIds": [
      "use-fishing-aquaculture",
      "use-gelatin-rendering",
      "use-dairy",
      "use-eggs"
    ],
    "alternativeIds": [],
    "sourceIds": [],
    "verificationAdvice": "Check the producer or a current vegan beverage database; ingredients alone may not reveal processing aids.",
    "needsResearch": true
  },
  {
    "id": "item-supplemented-food",
    "name": "Fortified and supplemented foods",
    "emoji": "🥣",
    "description": "Vitamin D3, omega-3 and other added nutrients can have animal or non-animal sources.",
    "locationIds": [
      "loc-kitchen"
    ],
    "category": "Food",
    "animalIds": [
      "animal-sheep",
      "animal-fish"
    ],
    "ingredientIds": [
      "ingredient-vitamin-d3",
      "ingredient-omega-3"
    ],
    "useIds": [
      "use-wool",
      "use-fishing-aquaculture"
    ],
    "alternativeIds": [
      "alt-algae-omega3"
    ],
    "sourceIds": [],
    "verificationAdvice": "Verify the source of ambiguous added nutrients.",
    "needsResearch": true
  },
  {
    "id": "item-bar-soap",
    "name": "Bar soap",
    "emoji": "🧼",
    "description": "Soap can be made with animal fats or plant oils; glycerin and stearic acid can also have multiple sources.",
    "locationIds": [
      "loc-bathroom"
    ],
    "category": "Personal care",
    "animalIds": [
      "animal-cattle",
      "animal-pig",
      "animal-sheep",
      "animal-goat"
    ],
    "ingredientIds": [
      "ingredient-tallow",
      "ingredient-glycerin",
      "ingredient-stearic-acid"
    ],
    "useIds": [
      "use-gelatin-rendering"
    ],
    "alternativeIds": [],
    "sourceIds": [],
    "verificationAdvice": "Look for a vegan claim and verify ambiguous fatty-acid ingredients.",
    "needsResearch": true
  },
  {
    "id": "item-shampoo",
    "name": "Shampoo",
    "emoji": "🧴",
    "description": "Hair products may contain keratin, collagen, honey, silk proteins or source-ambiguous fatty ingredients.",
    "locationIds": [
      "loc-bathroom"
    ],
    "category": "Personal care",
    "animalIds": [
      "animal-cattle",
      "animal-pig",
      "animal-bees",
      "animal-silkworm"
    ],
    "ingredientIds": [
      "ingredient-keratin",
      "ingredient-collagen",
      "ingredient-honey",
      "ingredient-glycerin",
      "ingredient-stearic-acid"
    ],
    "useIds": [
      "use-gelatin-rendering",
      "use-beekeeping",
      "use-silk"
    ],
    "alternativeIds": [],
    "sourceIds": [
      "src-fda-cosmetics-labeling",
      "src-fda-cruelty-free-claims"
    ],
    "verificationAdvice": "Check both ingredients and the brand’s current testing policy.",
    "needsResearch": false
  },
  {
    "id": "item-conditioner",
    "name": "Conditioner and hair treatments",
    "emoji": "💆",
    "description": "Conditioners and treatments may use keratin, collagen, silk proteins, lanolin or source-ambiguous fatty ingredients.",
    "locationIds": [
      "loc-bathroom"
    ],
    "category": "Personal care",
    "animalIds": [
      "animal-cattle",
      "animal-pig",
      "animal-sheep",
      "animal-silkworm"
    ],
    "ingredientIds": [
      "ingredient-keratin",
      "ingredient-collagen",
      "ingredient-lanolin",
      "ingredient-glycerin",
      "ingredient-stearic-acid"
    ],
    "useIds": [
      "use-wool",
      "use-silk",
      "use-gelatin-rendering"
    ],
    "alternativeIds": [],
    "sourceIds": [
      "src-fda-cosmetics-labeling",
      "src-fda-cruelty-free-claims"
    ],
    "verificationAdvice": "Verify ingredients and testing claims.",
    "needsResearch": false
  },
  {
    "id": "item-lotion",
    "name": "Lotion and moisturizer",
    "emoji": "🧴",
    "description": "Skin products may contain lanolin, beeswax, collagen, squalene, glycerin or stearic acid.",
    "locationIds": [
      "loc-bathroom",
      "loc-cosmetics"
    ],
    "category": "Personal care",
    "animalIds": [
      "animal-sheep",
      "animal-bees",
      "animal-cattle",
      "animal-pig",
      "animal-fish"
    ],
    "ingredientIds": [
      "ingredient-lanolin",
      "ingredient-beeswax",
      "ingredient-collagen",
      "ingredient-squalene",
      "ingredient-glycerin",
      "ingredient-stearic-acid"
    ],
    "useIds": [
      "use-wool",
      "use-beekeeping",
      "use-gelatin-rendering",
      "use-fishing-aquaculture"
    ],
    "alternativeIds": [],
    "sourceIds": [
      "src-fda-cosmetics-labeling",
      "src-fda-cruelty-free-claims"
    ],
    "verificationAdvice": "Source-ambiguous ingredients require manufacturer confirmation.",
    "needsResearch": false
  },
  {
    "id": "item-toothpaste",
    "name": "Toothpaste and mouth care",
    "emoji": "🦷",
    "description": "Some formulations may contain source-ambiguous glycerin, flavorings or other processing ingredients.",
    "locationIds": [
      "loc-bathroom"
    ],
    "category": "Personal care",
    "animalIds": [],
    "ingredientIds": [
      "ingredient-glycerin",
      "ingredient-natural-flavors"
    ],
    "useIds": [],
    "alternativeIds": [],
    "sourceIds": [],
    "verificationAdvice": "Do not assume glycerin is animal-derived; verify the formulation or vegan certification.",
    "needsResearch": true
  },
  {
    "id": "item-dental-floss",
    "name": "Dental floss",
    "emoji": "🧵",
    "description": "Some floss uses beeswax coatings while other products use plant or synthetic waxes.",
    "locationIds": [
      "loc-bathroom"
    ],
    "category": "Personal care",
    "animalIds": [
      "animal-bees"
    ],
    "ingredientIds": [
      "ingredient-beeswax"
    ],
    "useIds": [
      "use-beekeeping"
    ],
    "alternativeIds": [
      "alt-plant-waxes"
    ],
    "sourceIds": [],
    "verificationAdvice": "Check the coating material.",
    "needsResearch": true
  },
  {
    "id": "item-razor",
    "name": "Razors and lubricating strips",
    "emoji": "🪒",
    "description": "Lubricating strips can contain source-ambiguous glycerin or fatty ingredients.",
    "locationIds": [
      "loc-bathroom"
    ],
    "category": "Personal care",
    "animalIds": [],
    "ingredientIds": [
      "ingredient-glycerin",
      "ingredient-stearic-acid"
    ],
    "useIds": [],
    "alternativeIds": [],
    "sourceIds": [],
    "verificationAdvice": "Verify the strip composition with the manufacturer.",
    "needsResearch": true
  },
  {
    "id": "item-lipstick",
    "name": "Lipstick and lip balm",
    "emoji": "💄",
    "description": "Lip products may contain beeswax, lanolin, carmine, shellac, squalene or source-ambiguous fats.",
    "locationIds": [
      "loc-cosmetics"
    ],
    "category": "Cosmetics",
    "animalIds": [
      "animal-bees",
      "animal-sheep",
      "animal-cochineal",
      "animal-fish"
    ],
    "ingredientIds": [
      "ingredient-beeswax",
      "ingredient-lanolin",
      "ingredient-carmine",
      "ingredient-shellac",
      "ingredient-squalene"
    ],
    "useIds": [
      "use-beekeeping",
      "use-wool",
      "use-carmine",
      "use-fishing-aquaculture"
    ],
    "alternativeIds": [
      "alt-plant-waxes",
      "alt-noninsect-red-colors"
    ],
    "sourceIds": [
      "src-fda-cosmetics-labeling",
      "src-fda-carmine-labeling"
    ],
    "verificationAdvice": "Read the ingredient list and separately verify testing claims.",
    "needsResearch": false
  },
  {
    "id": "item-blush",
    "name": "Blush",
    "emoji": "🌸",
    "description": "Pink and red cosmetics may use carmine; formulations may also contain source-ambiguous binders.",
    "locationIds": [
      "loc-cosmetics"
    ],
    "category": "Cosmetics",
    "animalIds": [
      "animal-cochineal"
    ],
    "ingredientIds": [
      "ingredient-carmine"
    ],
    "useIds": [
      "use-carmine"
    ],
    "alternativeIds": [
      "alt-noninsect-red-colors"
    ],
    "sourceIds": [
      "src-fda-carmine-labeling"
    ],
    "verificationAdvice": "Carmine must be declared by name on U.S. cosmetic labeling.",
    "needsResearch": false
  },
  {
    "id": "item-eye-shadow",
    "name": "Eye shadow",
    "emoji": "👁️",
    "description": "Some shades may contain carmine, while binders and emollients may have variable sources.",
    "locationIds": [
      "loc-cosmetics"
    ],
    "category": "Cosmetics",
    "animalIds": [
      "animal-cochineal"
    ],
    "ingredientIds": [
      "ingredient-carmine",
      "ingredient-glycerin",
      "ingredient-stearic-acid"
    ],
    "useIds": [
      "use-carmine"
    ],
    "alternativeIds": [
      "alt-noninsect-red-colors"
    ],
    "sourceIds": [
      "src-fda-cosmetics-labeling",
      "src-fda-carmine-labeling"
    ],
    "verificationAdvice": "Check each shade because formulas can differ within one product line.",
    "needsResearch": false
  },
  {
    "id": "item-mascara",
    "name": "Mascara",
    "emoji": "👁️",
    "description": "Mascara may contain beeswax or other waxes and source-ambiguous fatty ingredients.",
    "locationIds": [
      "loc-cosmetics"
    ],
    "category": "Cosmetics",
    "animalIds": [
      "animal-bees"
    ],
    "ingredientIds": [
      "ingredient-beeswax",
      "ingredient-stearic-acid"
    ],
    "useIds": [
      "use-beekeeping"
    ],
    "alternativeIds": [
      "alt-plant-waxes"
    ],
    "sourceIds": [
      "src-fda-cosmetics-labeling"
    ],
    "verificationAdvice": "Verify the specific formula and testing policy.",
    "needsResearch": false
  },
  {
    "id": "item-makeup-brushes",
    "name": "Makeup and shaving brushes",
    "emoji": "🖌️",
    "description": "Brushes may use animal hair or synthetic fibers.",
    "locationIds": [
      "loc-cosmetics",
      "loc-bathroom"
    ],
    "category": "Cosmetics",
    "animalIds": [],
    "ingredientIds": [],
    "useIds": [],
    "alternativeIds": [],
    "sourceIds": [],
    "verificationAdvice": "Look for explicitly synthetic bristles; “cruelty-free” does not necessarily identify fiber content.",
    "needsResearch": true
  },
  {
    "id": "item-cosmetics-general",
    "name": "Cosmetics and cruelty-free claims",
    "emoji": "🧪",
    "description": "Vegan ingredients and animal-testing policies are separate questions. In the U.S., “cruelty-free” and “not tested on animals” do not have legal definitions.",
    "locationIds": [
      "loc-cosmetics"
    ],
    "category": "Cosmetics",
    "animalIds": [],
    "ingredientIds": [],
    "useIds": [
      "use-research-testing"
    ],
    "alternativeIds": [
      "alt-non-animal-research"
    ],
    "sourceIds": [
      "src-fda-cruelty-free-claims"
    ],
    "verificationAdvice": "Verify both ingredients and the scope of the company’s testing claim.",
    "needsResearch": false
  },
  {
    "id": "item-leather-shoes",
    "name": "Leather and suede shoes",
    "emoji": "👞",
    "description": "Footwear may use animal leather or suede in uppers, lining, trim or soles.",
    "locationIds": [
      "loc-closet"
    ],
    "category": "Clothing",
    "animalIds": [
      "animal-cattle",
      "animal-pig",
      "animal-sheep",
      "animal-goat"
    ],
    "ingredientIds": [],
    "useIds": [
      "use-leather"
    ],
    "alternativeIds": [
      "alt-nonleather-materials"
    ],
    "sourceIds": [
      "src-ftc-apparel-labeling"
    ],
    "verificationAdvice": "Check the complete material label, not only the upper.",
    "needsResearch": false
  },
  {
    "id": "item-leather-belt",
    "name": "Leather belts",
    "emoji": "👔",
    "description": "Belts commonly use leather in the strap or trim.",
    "locationIds": [
      "loc-closet"
    ],
    "category": "Accessories",
    "animalIds": [
      "animal-cattle",
      "animal-pig",
      "animal-sheep",
      "animal-goat"
    ],
    "ingredientIds": [],
    "useIds": [
      "use-leather"
    ],
    "alternativeIds": [
      "alt-nonleather-materials"
    ],
    "sourceIds": [
      "src-ftc-apparel-labeling"
    ],
    "verificationAdvice": "Look for clearly identified non-animal materials.",
    "needsResearch": false
  },
  {
    "id": "item-leather-wallet",
    "name": "Leather wallets",
    "emoji": "👛",
    "description": "Wallets and small accessories may use leather, suede or animal-derived trim.",
    "locationIds": [
      "loc-closet"
    ],
    "category": "Accessories",
    "animalIds": [
      "animal-cattle",
      "animal-pig",
      "animal-sheep",
      "animal-goat"
    ],
    "ingredientIds": [],
    "useIds": [
      "use-leather"
    ],
    "alternativeIds": [
      "alt-nonleather-materials"
    ],
    "sourceIds": [
      "src-ftc-apparel-labeling"
    ],
    "verificationAdvice": "Check exterior, lining and trim materials.",
    "needsResearch": false
  },
  {
    "id": "item-leather-bag",
    "name": "Leather handbags and luggage",
    "emoji": "👜",
    "description": "Bags and luggage may contain leather in bodies, handles, trim or tags.",
    "locationIds": [
      "loc-closet"
    ],
    "category": "Accessories",
    "animalIds": [
      "animal-cattle",
      "animal-pig",
      "animal-sheep",
      "animal-goat"
    ],
    "ingredientIds": [],
    "useIds": [
      "use-leather"
    ],
    "alternativeIds": [
      "alt-nonleather-materials"
    ],
    "sourceIds": [
      "src-ftc-apparel-labeling"
    ],
    "verificationAdvice": "Check all components, including trim.",
    "needsResearch": false
  },
  {
    "id": "item-wool-sweater",
    "name": "Wool sweaters and coats",
    "emoji": "🧥",
    "description": "Wool garments may use sheep wool or blends with other animal-hair fibers.",
    "locationIds": [
      "loc-closet"
    ],
    "category": "Clothing",
    "animalIds": [
      "animal-sheep",
      "animal-goat"
    ],
    "ingredientIds": [],
    "useIds": [
      "use-wool"
    ],
    "alternativeIds": [
      "alt-nonwool-fibers"
    ],
    "sourceIds": [
      "src-ftc-apparel-labeling"
    ],
    "verificationAdvice": "U.S. labels generally disclose fiber content.",
    "needsResearch": false
  },
  {
    "id": "item-cashmere-scarf",
    "name": "Cashmere and mohair",
    "emoji": "🧣",
    "description": "Cashmere is goat hair and mohair is produced from Angora goats.",
    "locationIds": [
      "loc-closet"
    ],
    "category": "Clothing",
    "animalIds": [
      "animal-goat"
    ],
    "ingredientIds": [],
    "useIds": [
      "use-wool"
    ],
    "alternativeIds": [
      "alt-nonwool-fibers"
    ],
    "sourceIds": [
      "src-ftc-apparel-labeling"
    ],
    "verificationAdvice": "Read fiber-content labels; blends may contain several fibers.",
    "needsResearch": false
  },
  {
    "id": "item-silk-clothing",
    "name": "Silk clothing and ties",
    "emoji": "👔",
    "description": "Silk fiber is produced from silkworm cocoons.",
    "locationIds": [
      "loc-closet"
    ],
    "category": "Clothing",
    "animalIds": [
      "animal-silkworm"
    ],
    "ingredientIds": [],
    "useIds": [
      "use-silk"
    ],
    "alternativeIds": [
      "alt-nonsilk-fibers"
    ],
    "sourceIds": [],
    "verificationAdvice": "Check fiber content; “satin” describes a weave and is not automatically silk.",
    "needsResearch": true
  },
  {
    "id": "item-down-jacket",
    "name": "Down jackets and vests",
    "emoji": "🧥",
    "description": "Insulated apparel may contain duck or goose down and feathers.",
    "locationIds": [
      "loc-closet"
    ],
    "category": "Clothing",
    "animalIds": [
      "animal-duck-goose"
    ],
    "ingredientIds": [],
    "useIds": [
      "use-feathers-down"
    ],
    "alternativeIds": [
      "alt-synthetic-insulation"
    ],
    "sourceIds": [],
    "verificationAdvice": "Check both shell and fill material.",
    "needsResearch": true
  },
  {
    "id": "item-fur-trim",
    "name": "Fur coats and trim",
    "emoji": "🧥",
    "description": "Garments may contain farmed or trapped animal fur, including trim on hoods and accessories.",
    "locationIds": [
      "loc-closet"
    ],
    "category": "Clothing",
    "animalIds": [
      "animal-rabbit",
      "animal-mink",
      "animal-fox",
      "animal-raccoon-dog",
      "animal-chinchilla",
      "animal-coyote"
    ],
    "ingredientIds": [],
    "useIds": [
      "use-fur",
      "use-wildlife-hunting-trapping"
    ],
    "alternativeIds": [
      "alt-nonfur-materials"
    ],
    "sourceIds": [
      "src-ftc-apparel-labeling",
      "src-idnr-furbearers"
    ],
    "verificationAdvice": "U.S. fur labels identify the animal name; inspect trim as well as the main garment.",
    "needsResearch": false
  },
  {
    "id": "item-down-comforter",
    "name": "Down comforters and duvets",
    "emoji": "🛏️",
    "description": "Bedding fill may contain duck or goose down and feathers.",
    "locationIds": [
      "loc-bedroom"
    ],
    "category": "Bedding",
    "animalIds": [
      "animal-duck-goose"
    ],
    "ingredientIds": [],
    "useIds": [
      "use-feathers-down"
    ],
    "alternativeIds": [
      "alt-synthetic-insulation"
    ],
    "sourceIds": [],
    "verificationAdvice": "Check the fill-content label.",
    "needsResearch": true
  },
  {
    "id": "item-feather-pillow",
    "name": "Feather and down pillows",
    "emoji": "🪶",
    "description": "Pillow fill may contain feathers, down or a mixture.",
    "locationIds": [
      "loc-bedroom"
    ],
    "category": "Bedding",
    "animalIds": [
      "animal-duck-goose",
      "animal-chicken"
    ],
    "ingredientIds": [],
    "useIds": [
      "use-feathers-down"
    ],
    "alternativeIds": [
      "alt-synthetic-insulation"
    ],
    "sourceIds": [],
    "verificationAdvice": "Look for kapok, polyester or other clearly non-animal fill.",
    "needsResearch": true
  },
  {
    "id": "item-wool-blanket",
    "name": "Wool blankets and mattress pads",
    "emoji": "🛏️",
    "description": "Blankets and bedding pads may contain wool.",
    "locationIds": [
      "loc-bedroom"
    ],
    "category": "Bedding",
    "animalIds": [
      "animal-sheep",
      "animal-goat"
    ],
    "ingredientIds": [],
    "useIds": [
      "use-wool"
    ],
    "alternativeIds": [
      "alt-nonwool-fibers"
    ],
    "sourceIds": [],
    "verificationAdvice": "Check fiber and fill labels.",
    "needsResearch": true
  },
  {
    "id": "item-silk-bedding",
    "name": "Silk sheets and pillowcases",
    "emoji": "🛏️",
    "description": "Some bedding uses silk fiber or silk-filled components.",
    "locationIds": [
      "loc-bedroom"
    ],
    "category": "Bedding",
    "animalIds": [
      "animal-silkworm"
    ],
    "ingredientIds": [],
    "useIds": [
      "use-silk"
    ],
    "alternativeIds": [
      "alt-nonsilk-fibers"
    ],
    "sourceIds": [],
    "verificationAdvice": "Check whether the product is silk or a non-animal satin fabric.",
    "needsResearch": true
  },
  {
    "id": "item-candles",
    "name": "Candles",
    "emoji": "🕯️",
    "description": "Candles may use beeswax, tallow, plant waxes, paraffin or blends.",
    "locationIds": [
      "loc-household"
    ],
    "category": "Household",
    "animalIds": [
      "animal-bees",
      "animal-cattle",
      "animal-pig",
      "animal-sheep",
      "animal-goat"
    ],
    "ingredientIds": [
      "ingredient-beeswax",
      "ingredient-tallow"
    ],
    "useIds": [
      "use-beekeeping",
      "use-gelatin-rendering"
    ],
    "alternativeIds": [
      "alt-plant-waxes"
    ],
    "sourceIds": [],
    "verificationAdvice": "Verify wax composition; “natural wax” is not specific.",
    "needsResearch": true
  },
  {
    "id": "item-upholstery",
    "name": "Furniture and vehicle upholstery",
    "emoji": "🛋️",
    "description": "Furniture and vehicle interiors may contain leather, wool, down or animal-hair blends.",
    "locationIds": [
      "loc-household"
    ],
    "category": "Household",
    "animalIds": [
      "animal-cattle",
      "animal-pig",
      "animal-sheep",
      "animal-goat",
      "animal-sheep",
      "animal-goat",
      "animal-chicken",
      "animal-turkey",
      "animal-duck-goose"
    ],
    "ingredientIds": [],
    "useIds": [
      "use-leather",
      "use-wool",
      "use-feathers-down"
    ],
    "alternativeIds": [
      "alt-nonleather-materials",
      "alt-nonwool-fibers",
      "alt-synthetic-insulation"
    ],
    "sourceIds": [],
    "verificationAdvice": "Request full upholstery and fill specifications.",
    "needsResearch": true
  },
  {
    "id": "item-laundry-products",
    "name": "Laundry products",
    "emoji": "🧺",
    "description": "Fabric softeners and detergents can contain source-ambiguous surfactants, glycerin, enzymes or fragrances.",
    "locationIds": [
      "loc-household"
    ],
    "category": "Cleaning",
    "animalIds": [],
    "ingredientIds": [
      "ingredient-glycerin",
      "ingredient-enzymes",
      "ingredient-natural-flavors"
    ],
    "useIds": [],
    "alternativeIds": [],
    "sourceIds": [],
    "verificationAdvice": "Verify ambiguous ingredients and testing policies with the manufacturer.",
    "needsResearch": true
  },
  {
    "id": "item-household-cleaners",
    "name": "Household cleaners",
    "emoji": "🧽",
    "description": "Cleaning products may use source-ambiguous surfactants or fatty-acid derivatives, and testing policies vary.",
    "locationIds": [
      "loc-household"
    ],
    "category": "Cleaning",
    "animalIds": [],
    "ingredientIds": [
      "ingredient-glycerin",
      "ingredient-stearic-acid"
    ],
    "useIds": [
      "use-research-testing"
    ],
    "alternativeIds": [
      "alt-non-animal-research"
    ],
    "sourceIds": [],
    "verificationAdvice": "Check both formulation and animal-testing information.",
    "needsResearch": true
  },
  {
    "id": "item-adhesives",
    "name": "Household glue and adhesives",
    "emoji": "🧴",
    "description": "Modern adhesives have varied formulations; some specialty glues may use animal collagen or casein.",
    "locationIds": [
      "loc-household",
      "loc-art-tools"
    ],
    "category": "Household",
    "animalIds": [
      "animal-cattle",
      "animal-pig"
    ],
    "ingredientIds": [
      "ingredient-collagen",
      "ingredient-casein"
    ],
    "useIds": [
      "use-gelatin-rendering",
      "use-dairy"
    ],
    "alternativeIds": [],
    "sourceIds": [],
    "verificationAdvice": "Do not assume all glue is animal-derived; verify specialty or unlabeled formulations.",
    "needsResearch": true
  },
  {
    "id": "item-gelatin-capsules",
    "name": "Gelatin capsules",
    "emoji": "💊",
    "description": "Hard or soft capsules may use animal-derived gelatin; vegetarian capsules commonly use cellulose-based materials.",
    "locationIds": [
      "loc-medicine"
    ],
    "category": "Medicine",
    "animalIds": [
      "animal-cattle",
      "animal-pig"
    ],
    "ingredientIds": [
      "ingredient-gelatin"
    ],
    "useIds": [
      "use-gelatin-rendering"
    ],
    "alternativeIds": [
      "alt-plant-gelling"
    ],
    "sourceIds": [],
    "verificationAdvice": "Ask a pharmacist about formulation alternatives, but never stop medically necessary treatment.",
    "needsResearch": true
  },
  {
    "id": "item-fish-oil",
    "name": "Fish-oil supplements",
    "emoji": "🐟",
    "description": "Supplements may supply EPA and DHA from fish oil and may also use gelatin capsules.",
    "locationIds": [
      "loc-medicine"
    ],
    "category": "Supplement",
    "animalIds": [
      "animal-fish",
      "animal-cattle",
      "animal-pig"
    ],
    "ingredientIds": [
      "ingredient-omega-3",
      "ingredient-gelatin"
    ],
    "useIds": [
      "use-fishing-aquaculture",
      "use-gelatin-rendering"
    ],
    "alternativeIds": [
      "alt-algae-omega3"
    ],
    "sourceIds": [],
    "verificationAdvice": "Compare the active omega-3 form and dose; seek medical guidance when appropriate.",
    "needsResearch": true
  },
  {
    "id": "item-vitamin-d",
    "name": "Vitamin D supplements",
    "emoji": "☀️",
    "description": "Vitamin D3 may be sourced from lanolin or non-animal sources; capsule shells and excipients also vary.",
    "locationIds": [
      "loc-medicine"
    ],
    "category": "Supplement",
    "animalIds": [
      "animal-sheep"
    ],
    "ingredientIds": [
      "ingredient-vitamin-d3",
      "ingredient-lanolin",
      "ingredient-gelatin"
    ],
    "useIds": [
      "use-wool",
      "use-gelatin-rendering"
    ],
    "alternativeIds": [],
    "sourceIds": [],
    "verificationAdvice": "Look for an explicitly vegan D3 source or consider D2 when appropriate; follow medical advice.",
    "needsResearch": true
  },
  {
    "id": "item-medication",
    "name": "Prescription and over-the-counter medication",
    "emoji": "⚕️",
    "description": "Medicines may contain animal-derived or source-ambiguous excipients, but treatment decisions must prioritize health and safety.",
    "locationIds": [
      "loc-medicine"
    ],
    "category": "Medicine",
    "animalIds": [],
    "ingredientIds": [
      "ingredient-gelatin",
      "ingredient-lactose",
      "ingredient-glycerin",
      "ingredient-stearic-acid"
    ],
    "useIds": [],
    "alternativeIds": [],
    "sourceIds": [],
    "verificationAdvice": "Never stop or delay necessary medication. Ask a pharmacist or prescriber whether a suitable alternative formulation exists.",
    "needsResearch": true
  },
  {
    "id": "item-artist-brushes",
    "name": "Artist and specialty brushes",
    "emoji": "🖌️",
    "description": "Some brushes use animal hair while others use synthetic fibers.",
    "locationIds": [
      "loc-art-tools"
    ],
    "category": "Art supplies",
    "animalIds": [],
    "ingredientIds": [],
    "useIds": [],
    "alternativeIds": [],
    "sourceIds": [],
    "verificationAdvice": "Check bristle material; product names may refer to a style rather than actual fiber.",
    "needsResearch": true
  },
  {
    "id": "item-crayons",
    "name": "Crayons and wax art supplies",
    "emoji": "🖍️",
    "description": "Wax formulations can include plant, mineral, synthetic or animal-derived components such as tallow derivatives.",
    "locationIds": [
      "loc-art-tools"
    ],
    "category": "Art supplies",
    "animalIds": [
      "animal-cattle",
      "animal-pig",
      "animal-sheep",
      "animal-goat"
    ],
    "ingredientIds": [
      "ingredient-tallow",
      "ingredient-stearic-acid"
    ],
    "useIds": [
      "use-gelatin-rendering"
    ],
    "alternativeIds": [],
    "sourceIds": [],
    "verificationAdvice": "Verify with the manufacturer because complete formulations may not appear on packaging.",
    "needsResearch": true
  },
  {
    "id": "item-photographic-film",
    "name": "Photographic film and photo paper",
    "emoji": "📷",
    "description": "Traditional photographic emulsions commonly use gelatin as a binder.",
    "locationIds": [
      "loc-art-tools"
    ],
    "category": "Photography",
    "animalIds": [
      "animal-cattle",
      "animal-pig"
    ],
    "ingredientIds": [
      "ingredient-gelatin"
    ],
    "useIds": [
      "use-gelatin-rendering"
    ],
    "alternativeIds": [
      "alt-plant-gelling"
    ],
    "sourceIds": [],
    "verificationAdvice": "Digital photography avoids film emulsion, but printing materials still require separate verification.",
    "needsResearch": true
  },
  {
    "id": "item-musical-instruments",
    "name": "Musical instruments and bows",
    "emoji": "🎻",
    "description": "Some instruments or accessories may use hide glue, leather, shell, bone, horsehair or other animal materials.",
    "locationIds": [
      "loc-art-tools"
    ],
    "category": "Music",
    "animalIds": [
      "animal-cattle",
      "animal-horse-donkey"
    ],
    "ingredientIds": [
      "ingredient-collagen"
    ],
    "useIds": [
      "use-leather",
      "use-gelatin-rendering",
      "use-work-transport"
    ],
    "alternativeIds": [],
    "sourceIds": [],
    "verificationAdvice": "Ask the maker for a component-level material list; vintage instruments may differ from current models.",
    "needsResearch": true
  }
];

  // ---- Household Locations ----
  const householdLocations = [
  {
    "id": "loc-kitchen",
    "name": "Kitchen & Groceries",
    "emoji": "🍳",
    "description": "Food, drinks, cooking and baking products."
  },
  {
    "id": "loc-bathroom",
    "name": "Bathroom & Personal Care",
    "emoji": "🧴",
    "description": "Hygiene, skin, hair and dental-care products."
  },
  {
    "id": "loc-cosmetics",
    "name": "Cosmetics",
    "emoji": "💄",
    "description": "Makeup, beauty products and applicators."
  },
  {
    "id": "loc-closet",
    "name": "Closet & Accessories",
    "emoji": "👗",
    "description": "Clothing, shoes, bags and textile materials."
  },
  {
    "id": "loc-bedroom",
    "name": "Bedroom & Bedding",
    "emoji": "🛏️",
    "description": "Pillows, comforters, blankets and sheets."
  },
  {
    "id": "loc-household",
    "name": "Household & Cleaning",
    "emoji": "🏠",
    "description": "Furniture, candles, cleaners, laundry and home supplies."
  },
  {
    "id": "loc-medicine",
    "name": "Medicine & Supplements",
    "emoji": "💊",
    "description": "Capsules, vitamins, supplements and medically necessary products."
  },
  {
    "id": "loc-art-tools",
    "name": "Art, Tools & Misc.",
    "emoji": "🎨",
    "description": "Art supplies, brushes, adhesives and specialty materials."
  }
];

  // ---- Nutrients ----
  const nutrients = [
  {
    "id": "nutrient-b12",
    "name": "Vitamin B12",
    "priority": "Essential planning item",
    "purpose": "Supports healthy blood cells, DNA synthesis and neurologic function.",
    "dailyReference": "Adults: 2.4 mcg/day; pregnancy: 2.6 mcg; breastfeeding: 2.8 mcg (U.S. RDA).",
    "veganSources": [
      "B12-fortified plant milks",
      "B12-fortified nutritional yeast",
      "B12-fortified cereals",
      "B12 supplements"
    ],
    "absorptionNotes": "Absorption uses active and passive pathways and can be reduced by some gastrointestinal conditions, surgery and medicines. Unfortified plant foods are not reliable sources.",
    "deficiencyConsiderations": "Deficiency can cause megaloblastic anemia and neurologic changes; symptoms may be delayed and nerve damage can become irreversible.",
    "supplementNotes": "Use a reliable fortified-food or supplement plan. Product dose and frequency vary; follow professional advice rather than assuming all products are equivalent.",
    "relatedRecipeIds": [
      "recipe-overnight-oats",
      "recipe-vegan-pancakes"
    ],
    "sourceIds": [
      "src-nih-b12"
    ],
    "medicalDisclaimer": "General education only—not a diagnosis or individualized medical recommendation. Ask a qualified clinician or registered dietitian about your needs, laboratory testing, medicines and supplements.",
    "needsResearch": false
  },
  {
    "id": "nutrient-protein",
    "name": "Protein",
    "priority": "Daily foundation",
    "purpose": "Provides amino acids used in tissue, enzymes, hormones and immune function.",
    "dailyReference": "Needs depend on body size and life stage; the adult RDA is 0.8 g/kg/day in U.S. guidance, with different needs in growth, pregnancy and some athletic contexts.",
    "veganSources": [
      "Beans",
      "Lentils",
      "Peas",
      "Tofu",
      "Tempeh",
      "Soy milk",
      "Seitan",
      "Nuts",
      "Seeds"
    ],
    "absorptionNotes": "Digestibility and amino-acid profiles vary, so eat enough total food and a variety of protein-rich plants across the day.",
    "deficiencyConsiderations": "Low intake is more likely when total energy intake is inadequate or diets are extremely restricted.",
    "supplementNotes": "Protein powder is optional for most people; check allergens and third-party testing when relevant.",
    "relatedRecipeIds": [
      "recipe-tofu-scramble",
      "recipe-black-bean-burger",
      "recipe-chickpea-curry",
      "recipe-lentil-bolognese"
    ],
    "sourceIds": [
      "src-dga-2020-2025"
    ],
    "medicalDisclaimer": "General education only—not a diagnosis or individualized medical recommendation. Ask a qualified clinician or registered dietitian about your needs, laboratory testing, medicines and supplements.",
    "needsResearch": false
  },
  {
    "id": "nutrient-iron",
    "name": "Iron",
    "priority": "Plan routinely",
    "purpose": "Needed for hemoglobin, myoglobin, growth and cellular function.",
    "dailyReference": "Adult U.S. RDA: 8 mg/day for men and 18 mg/day for premenopausal women; vegetarian iron needs may be higher because nonheme iron is less bioavailable.",
    "veganSources": [
      "Lentils",
      "Beans",
      "Tofu",
      "Fortified cereals",
      "Pumpkin seeds",
      "Quinoa",
      "Spinach"
    ],
    "absorptionNotes": "Vitamin C improves nonheme iron absorption. Phytate and polyphenols can reduce it; tea and coffee are best separated from iron-rich meals when iron status is a concern.",
    "deficiencyConsiderations": "Risk differs with menstruation, pregnancy, blood loss, growth and gastrointestinal conditions. Fatigue alone does not diagnose iron deficiency.",
    "supplementNotes": "Do not take high-dose iron unless advised; excess can be harmful and iron can interact with medicines.",
    "relatedRecipeIds": [
      "recipe-chickpea-curry",
      "recipe-lentil-bolognese"
    ],
    "sourceIds": [
      "src-nih-iron"
    ],
    "medicalDisclaimer": "General education only—not a diagnosis or individualized medical recommendation. Ask a qualified clinician or registered dietitian about your needs, laboratory testing, medicines and supplements.",
    "needsResearch": false
  },
  {
    "id": "nutrient-calcium",
    "name": "Calcium",
    "priority": "Daily foundation",
    "purpose": "Supports bones and teeth, muscle contraction, nerve signaling and blood-vessel function.",
    "dailyReference": "Most adults: 1,000 mg/day in U.S. guidance; some older adults need 1,200 mg/day.",
    "veganSources": [
      "Calcium-fortified plant milk",
      "Calcium-set tofu",
      "Kale",
      "Bok choy",
      "Turnip greens",
      "Fortified orange juice"
    ],
    "absorptionNotes": "Absorption varies. Calcium from low-oxalate greens and many fortified beverages is useful; spinach is calcium-rich but its oxalate limits absorption. Shake fortified beverages.",
    "deficiencyConsiderations": "Long-term low intake can compromise bone health. Vitamin D status, exercise, age and other factors also matter.",
    "supplementNotes": "If food intake is insufficient, discuss type and dose; large single doses are absorbed less efficiently and supplements can interact with medicines.",
    "relatedRecipeIds": [
      "recipe-tofu-scramble",
      "recipe-overnight-oats"
    ],
    "sourceIds": [
      "src-nih-calcium"
    ],
    "medicalDisclaimer": "General education only—not a diagnosis or individualized medical recommendation. Ask a qualified clinician or registered dietitian about your needs, laboratory testing, medicines and supplements.",
    "needsResearch": false
  },
  {
    "id": "nutrient-vitamin-d",
    "name": "Vitamin D",
    "priority": "Check exposure and fortification",
    "purpose": "Promotes calcium absorption and supports bone, muscle, nerve and immune function.",
    "dailyReference": "U.S. RDA: 15 mcg (600 IU)/day for ages 1–70 and 20 mcg (800 IU)/day over 70.",
    "veganSources": [
      "Vitamin-D-fortified plant milk",
      "Fortified cereal",
      "UV-exposed mushrooms",
      "Vegan vitamin D2 or lichen-derived D3 supplements"
    ],
    "absorptionNotes": "Vitamin D is fat-soluble. Sun production varies with season, latitude, skin pigmentation, age and sun protection; food fortification varies by product.",
    "deficiencyConsiderations": "People with limited sun exposure, malabsorption and certain other risk factors may need assessment.",
    "supplementNotes": "Check whether D3 is lichen-derived if vegan sourcing matters. Avoid megadoses unless medically supervised.",
    "relatedRecipeIds": [
      "recipe-overnight-oats"
    ],
    "sourceIds": [
      "src-nih-vitamin-d"
    ],
    "medicalDisclaimer": "General education only—not a diagnosis or individualized medical recommendation. Ask a qualified clinician or registered dietitian about your needs, laboratory testing, medicines and supplements.",
    "needsResearch": false
  },
  {
    "id": "nutrient-iodine",
    "name": "Iodine",
    "priority": "Use a dependable source",
    "purpose": "Required to make thyroid hormones that regulate metabolism and support development.",
    "dailyReference": "Adults: 150 mcg/day; pregnancy: 220 mcg; breastfeeding: 290 mcg (U.S. RDA).",
    "veganSources": [
      "Iodized salt",
      "Some fortified foods",
      "Measured iodine supplements",
      "Seaweed (highly variable)"
    ],
    "absorptionNotes": "Amounts in seaweed vary widely, and specialty salts are often not iodized. Check the package rather than assuming.",
    "deficiencyConsiderations": "Both too little and too much iodine can disrupt thyroid function. Pregnancy increases needs.",
    "supplementNotes": "Avoid relying on kelp with an unknown dose. People with thyroid conditions should discuss iodine intake with a clinician.",
    "relatedRecipeIds": [],
    "sourceIds": [
      "src-nih-iodine"
    ],
    "medicalDisclaimer": "General education only—not a diagnosis or individualized medical recommendation. Ask a qualified clinician or registered dietitian about your needs, laboratory testing, medicines and supplements.",
    "needsResearch": false
  },
  {
    "id": "nutrient-omega3",
    "name": "Omega-3 fatty acids",
    "priority": "Include regularly",
    "purpose": "ALA is essential; EPA and DHA are structural and signaling fats with important roles in the body.",
    "dailyReference": "Adequate intake for ALA: 1.6 g/day for adult men and 1.1 g/day for adult women in U.S. guidance; no federal RDA is set for EPA/DHA.",
    "veganSources": [
      "Ground flaxseed",
      "Chia seeds",
      "Walnuts",
      "Hemp seeds",
      "Canola oil",
      "Algae-derived EPA/DHA supplements"
    ],
    "absorptionNotes": "The body converts only a limited amount of ALA to EPA and DHA. Grinding flax improves access to its fats.",
    "deficiencyConsiderations": "People who eat no fish may consider algae-derived EPA/DHA depending on life stage and clinical advice.",
    "supplementNotes": "Algae oil is the direct vegan source of EPA/DHA. Discuss supplements if pregnant, breastfeeding, taking anticoagulants or preparing for surgery.",
    "relatedRecipeIds": [
      "recipe-overnight-oats"
    ],
    "sourceIds": [
      "src-nih-omega3"
    ],
    "medicalDisclaimer": "General education only—not a diagnosis or individualized medical recommendation. Ask a qualified clinician or registered dietitian about your needs, laboratory testing, medicines and supplements.",
    "needsResearch": false
  },
  {
    "id": "nutrient-zinc",
    "name": "Zinc",
    "priority": "Include varied sources",
    "purpose": "Supports immune function, protein and DNA synthesis, wound healing and taste.",
    "dailyReference": "Adult U.S. RDA: 11 mg/day for men and 8 mg/day for women; pregnancy and breastfeeding needs are higher.",
    "veganSources": [
      "Beans",
      "Chickpeas",
      "Lentils",
      "Tofu",
      "Pumpkin seeds",
      "Cashews",
      "Fortified cereals"
    ],
    "absorptionNotes": "Phytate reduces zinc absorption. Soaking, sprouting, fermenting and leavening can improve bioavailability.",
    "deficiencyConsiderations": "Risk is higher with malabsorption, severe restriction and some life stages; symptoms are nonspecific.",
    "supplementNotes": "Long-term high-dose zinc can cause copper deficiency and other harms.",
    "relatedRecipeIds": [
      "recipe-chickpea-curry",
      "recipe-black-bean-burger"
    ],
    "sourceIds": [
      "src-nih-zinc"
    ],
    "medicalDisclaimer": "General education only—not a diagnosis or individualized medical recommendation. Ask a qualified clinician or registered dietitian about your needs, laboratory testing, medicines and supplements.",
    "needsResearch": false
  },
  {
    "id": "nutrient-selenium",
    "name": "Selenium",
    "priority": "Meet needs without excess",
    "purpose": "Supports thyroid hormone metabolism, DNA synthesis and antioxidant enzymes.",
    "dailyReference": "Adults: 55 mcg/day; pregnancy: 60 mcg; breastfeeding: 70 mcg (U.S. RDA).",
    "veganSources": [
      "Whole grains",
      "Beans",
      "Lentils",
      "Nuts",
      "Seeds",
      "Brazil nuts (very variable and often high)"
    ],
    "absorptionNotes": "Plant-food selenium reflects soil content, so amounts vary geographically and by food source.",
    "deficiencyConsiderations": "Deficiency is uncommon in the United States but risk rises with some medical conditions or low-selenium regions.",
    "supplementNotes": "Do not use several Brazil nuts as a precisely dosed supplement; chronic excess can cause selenosis.",
    "relatedRecipeIds": [],
    "sourceIds": [
      "src-nih-selenium"
    ],
    "medicalDisclaimer": "General education only—not a diagnosis or individualized medical recommendation. Ask a qualified clinician or registered dietitian about your needs, laboratory testing, medicines and supplements.",
    "needsResearch": false
  },
  {
    "id": "nutrient-choline",
    "name": "Choline",
    "priority": "Include varied sources",
    "purpose": "Used in cell membranes, neurotransmission, lipid transport and early brain development.",
    "dailyReference": "Adequate intake: 550 mg/day for adult men and 425 mg/day for adult women; 450 mg in pregnancy and 550 mg while breastfeeding.",
    "veganSources": [
      "Soybeans",
      "Tofu",
      "Kidney beans",
      "Quinoa",
      "Broccoli",
      "Brussels sprouts",
      "Peanuts"
    ],
    "absorptionNotes": "The body makes some choline, but not always enough to meet needs; food amounts add up across the day.",
    "deficiencyConsiderations": "Pregnancy and breastfeeding are especially important life stages. Very low intake can affect liver and muscle.",
    "supplementNotes": "Assess the whole diet before supplementing; the tolerable upper limit for adults is 3,500 mg/day.",
    "relatedRecipeIds": [
      "recipe-tofu-scramble",
      "recipe-quinoa-chickpea-meal-prep-bowls"
    ],
    "sourceIds": [
      "src-nih-choline"
    ],
    "medicalDisclaimer": "General education only—not a diagnosis or individualized medical recommendation. Ask a qualified clinician or registered dietitian about your needs, laboratory testing, medicines and supplements.",
    "needsResearch": false
  }
];

  // ---- Transition Paths & Tasks ----
  const transitionPaths = [
    { id: 'one-swap', label: 'One swap' },
    { id: 'seven-day', label: '7‑day intro' },
    { id: 'thirty-day', label: '30‑day transition' },
    { id: 'whole-food', label: 'Whole‑food' }
  ];
  const transitionTasksByPath = {
    'one-swap': ['Pick one product to replace', 'Find a vegan alternative', 'Try it this week'],
    'seven-day': ['Day 1: Try plant milk', 'Day 2: Vegan breakfast', 'Day 3: Meat alternative', 'Day 4: Hidden ingredients', 'Day 5: Vegan cheese', 'Day 6: Nutrition basics', 'Day 7: Reflect'],
    'thirty-day': ['Days 1–7: Discover', 'Days 8–14: Replace', 'Days 15–21: Build confidence', 'Days 22–30: Sustain'],
    'whole-food': ['Stock whole grains', 'Buy legumes', 'Add fresh veg', 'Use nuts & seeds', 'Cook from scratch']
  };


  // ---- PHASE 1 DIETARY DATA AUDIT ----
  // Tags describe manufacturer-listed ingredients/claims, not cross-contact guarantees.
  const addDietaryTags = (productId, tags, basis) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    product.dietaryTags = Array.from(new Set([...(product.dietaryTags || []), ...tags]));
    product.dietaryTagBasis = basis;
    product.dietaryTagsLastVerified = '2026-08-20';
  };

  products.filter(p => p.brand === 'Impossible Foods').forEach(p =>
    addDietaryTags(p.id, ['peanut-free', 'tree-nut-free'], 'Impossible Foods states that its meat-from-plants products contain soy and do not contain peanuts or tree nuts; verify current packaging for cross-contact and formulation changes.')
  );

  products.filter(p => p.brand === 'Beyond Meat').forEach(p =>
    addDietaryTags(p.id, ['soy-free', 'peanut-free', 'tree-nut-free'], 'Beyond Meat product information states these listed products contain no soy, peanuts, or tree nuts; pea protein can still be relevant to people with severe legume allergies. Verify current packaging.')
  );

  [
    'product-oatly-original-oatmilk',
    'product-oatly-barista-edition-oatmilk',
    'product-oatly-vanilla-frozen-dessert',
    'product-oatly-chocolate-frozen-dessert'
  ].forEach(id => addDietaryTags(id, ['soy-free', 'peanut-free', 'tree-nut-free'], 'The current Oatly U.S. product page describes this product as containing no soy or nuts. Verify current packaging and manufacturer guidance for cross-contact.'));

  const impossibleSource = sources.find(s => s.id === 'src-product-impossible');
  if (impossibleSource) { impossibleSource.url = 'https://faq.impossiblefoods.com/hc/en-us/articles/360018937694-What-allergens-do-your-products-contain'; impossibleSource.title = 'Impossible Foods allergen information'; }
  const beyondSource = sources.find(s => s.id === 'src-product-beyond');
  if (beyondSource) { beyondSource.url = 'https://www.beyondmeat.com/en-US/products/the-beyond-burger'; beyondSource.title = 'Beyond Meat product and allergen information'; }
  const oatlySource = sources.find(s => s.id === 'src-product-oatly');
  if (oatlySource) { oatlySource.url = 'https://www.oatly.com/en-us/products'; oatlySource.title = 'Oatly U.S. product and allergen information'; }

  // ---- PHASE 1 DIETARY DATA BATCH 2 ----
  addDietaryTags('product-planet-oat-original-oatmilk', ['soy-free', 'peanut-free'], 'Planet Oat states that its oatmilk is free from soy and peanuts. Tree-nut status is not assigned without a clearer current manufacturer statement.');
  addDietaryTags('product-almond-breeze-unsweetened-almondmilk', ['soy-free'], 'Blue Diamond states that all Almond Breeze products are soy-free. This product contains almonds, so it is not tree-nut-free; peanut-free status is not assigned without a specific claim.');
  addDietaryTags('product-califia-farms-oat-barista-blend', ['soy-free'], 'The current Califia Farms Oat Barista Blend page identifies the product as soy-free. Peanut and tree-nut status remain unassigned pending clearer product-specific evidence.');
  addDietaryTags('product-ripple-ripple-original-plant-based-milk', ['soy-free', 'peanut-free', 'tree-nut-free'], 'Ripple describes its Original Plant-Based Milk as soy-free and nut-free. Verify current packaging, especially for severe legume allergies involving pea protein.');
  addDietaryTags('product-good-karma-flaxmilk', ['soy-free', 'peanut-free', 'tree-nut-free'], 'Good Karma states that its products are free of soy, peanuts, and tree nuts and describes its allergen-control process. Verify current packaging.');
  addDietaryTags('product-kite-hill-plain-almond-milk-yogurt', ['soy-free'], 'Kite Hill states that its Original Yogurts do not contain soy. Kite Hill products contain almond milk, so tree-nut-free is not assigned; peanut-free remains unassigned without a product-specific claim.');
  addDietaryTags('product-silk-original-soymilk', ['peanut-free', 'tree-nut-free'], 'Silk lists soy as the declared allergen and states that its natural flavors exclude peanut and tree-nut ingredients. These tags describe listed ingredients, not a cross-contact guarantee.');
  addDietaryTags('product-silk-unsweet-soymilk', ['peanut-free', 'tree-nut-free'], 'Silk lists soy as the declared allergen and states that its natural flavors exclude peanut and tree-nut ingredients. These tags describe listed ingredients, not a cross-contact guarantee.');
  addDietaryTags('product-silk-soymilk-yogurt-alternative', ['peanut-free', 'tree-nut-free'], 'Silk lists soy as the declared allergen for its soymilk yogurt and states that its natural flavors exclude peanut and tree-nut ingredients. Verify current packaging.');

  const setProductUrl = (id, url) => { const p = products.find(item => item.id === id); if (p) p.productUrl = url; };
  setProductUrl('product-planet-oat-original-oatmilk', 'https://planetoat.com/');
  setProductUrl('product-almond-breeze-unsweetened-almondmilk', 'https://www.bluediamond.com/brand/almond-breeze/refrigerated-almondmilk/unsweetened-original/');
  setProductUrl('product-califia-farms-oat-barista-blend', 'https://www.califiafarms.com/products/oat-barista-blend/');
  setProductUrl('product-ripple-ripple-original-plant-based-milk', 'https://ripplefoods.com/products/ripple-shelf-stable-original-milk-6-pack');
  setProductUrl('product-good-karma-flaxmilk', 'https://goodkarmafoods.com/pages/allergen-free');
  setProductUrl('product-kite-hill-plain-almond-milk-yogurt', 'https://kite-hill.com/pages/faq');
  setProductUrl('product-silk-unsweet-soymilk', 'https://silk.com/plant-based-products/soymilk/unsweet-soymilk/');
  setProductUrl('product-silk-soymilk-yogurt-alternative', 'https://silk.com/plant-based-products/dairy-free-yogurt-alternatives/vanilla-soy-dairy-free-yogurt-alternative/');

  // ---- PHASE 1 DIETARY DATA BATCH 3 ----
  addDietaryTags('product-meati-plant-based-steak', ['soy-free', 'peanut-free', 'tree-nut-free'], 'Meati states that its Classic Steak is free of the nine major allergens, including soy, peanuts, and tree nuts. People with mold or fungi allergies should review Meati guidance.');
  addDietaryTags('product-boca-original-vegan-veggie-burgers', ['peanut-free', 'tree-nut-free'], 'The current Kraft Heinz ingredient and allergen listing declares soy and wheat, with no peanut or tree-nut ingredients listed. This is not a facility cross-contact guarantee.');
  addDietaryTags('product-daring-original-chick-n-tenders', ['peanut-free', 'tree-nut-free'], 'Daring states that its Plant Chicken pieces and wings are nut-free and contain soy. Verify current packaging.');
  addDietaryTags('product-abbot-s-plant-based-chick-n-pieces', ['soy-free', 'peanut-free', 'tree-nut-free'], 'Abbot’s states that its products are free of the top eight allergens, including soy, peanuts, and tree nuts. Pea protein may still matter for some people with severe legume allergies.');
  addDietaryTags('product-tofurky-hickory-smoked-plant-based-deli-slices', ['peanut-free', 'tree-nut-free'], 'Tofurky lists soy and wheat as declared allergens, with no peanut or tree-nut ingredients listed. This is not a facility cross-contact guarantee.');
  addDietaryTags('product-tofurky-oven-roasted-plant-based-deli-slices', ['peanut-free', 'tree-nut-free'], 'Tofurky lists soy and wheat as declared allergens, with no peanut or tree-nut ingredients listed. This is not a facility cross-contact guarantee.');
  addDietaryTags('product-field-roast-italian-garlic-and-fennel-plant-based-sausage', ['peanut-free', 'tree-nut-free'], 'Field Roast currently declares wheat for this product and lists no peanut or tree-nut ingredients. Soy-free is not assigned because soybean oil appears in the ingredient list.');
  addDietaryTags('product-field-roast-smoked-apple-and-sage-plant-based-sausage', ['peanut-free', 'tree-nut-free'], 'Field Roast currently declares wheat for this product and lists no peanut or tree-nut ingredients. Soy-free is not assigned because soybean oil appears in the ingredient list.');
  addDietaryTags('product-field-roast-frankfurters', ['peanut-free', 'tree-nut-free'], 'Field Roast currently declares wheat for Classic Smoked Frankfurters and lists no peanut or tree-nut ingredients. Soy-free is not assigned because soybean oil appears in the ingredient list.');
  addDietaryTags('product-lightlife-smart-dogs', ['peanut-free', 'tree-nut-free'], 'Lightlife declares soy and lists no peanut or tree-nut ingredients for Smart Dogs. Pea protein appears in the formula and can matter for some people with severe legume allergies.');
  addDietaryTags('product-lightlife-smart-bacon', ['peanut-free', 'tree-nut-free'], 'Lightlife declares wheat and soy and lists no peanut or tree-nut ingredients for Smart Bacon. This is not a facility cross-contact guarantee.');
  addDietaryTags('product-lightlife-smoky-tempeh-strips', ['peanut-free', 'tree-nut-free'], 'Lightlife declares soy and lists no peanut or tree-nut ingredients for Smoky Tempeh Strips. This is not a facility cross-contact guarantee.');
  addDietaryTags('product-morningstar-farms-plant-based-chick-n-nuggets', ['peanut-free', 'tree-nut-free'], 'MorningStar Farms lists wheat and soy ingredients and no peanut or tree-nut ingredients for its current Chik’n Nuggets formula. Verify the current package and SmartLabel.');
  addDietaryTags('product-good-catch-plant-based-fish-sticks', ['peanut-free', 'tree-nut-free'], 'Good Catch lists soy and wheat for its breaded fish-style product and no peanut or tree-nut ingredients. Pea protein may matter for some people with severe legume allergies.');
  addDietaryTags('product-good-catch-plant-based-tuna', ['peanut-free', 'tree-nut-free'], 'Good Catch declares soy for Plant-Based Tuna and lists no peanut or tree-nut ingredients. Pea protein may matter for some people with severe legume allergies.');

  setProductUrl('product-meati-plant-based-steak', 'https://www.meati.com/pages/faqs');
  setProductUrl('product-boca-original-vegan-veggie-burgers', 'https://www.kraftheinz.com/boca/products/00759283334455-original-vegan-veggie-burgers');
  setProductUrl('product-daring-original-chick-n-tenders', 'https://daring.com/faq/');
  setProductUrl('product-abbot-s-plant-based-chick-n-pieces', 'https://abbots.com/our-journal/what-is-soy-protein-isolate-abbots-butcher');
  setProductUrl('product-tofurky-hickory-smoked-plant-based-deli-slices', 'https://tofurky.com/what-we-make/deli-slices/hickory-smoked/');
  setProductUrl('product-tofurky-oven-roasted-plant-based-deli-slices', 'https://tofurky.com/what-we-make/deli-slices/roasted-turky/');
  setProductUrl('product-field-roast-italian-garlic-and-fennel-plant-based-sausage', 'https://fieldroast.com/product/italian-sausage/');
  setProductUrl('product-field-roast-smoked-apple-and-sage-plant-based-sausage', 'https://fieldroast.com/product/smoked-apple-sage-sausage/');
  setProductUrl('product-field-roast-frankfurters', 'https://fieldroast.com/product/frankfurters/');
  setProductUrl('product-lightlife-smart-dogs', 'https://lightlife.com/product/smart-dogs/');
  setProductUrl('product-lightlife-smart-bacon', 'https://lightlife.com/product/smart-bacon/');
  setProductUrl('product-lightlife-smoky-tempeh-strips', 'https://lightlife.com/product/smoky-tempeh-strips/');
  setProductUrl('product-morningstar-farms-plant-based-chick-n-nuggets', 'https://www.morningstarfarms.com/en_US/products/chikn/morningstar-farms-chik-n-nuggets-product.html');
  setProductUrl('product-good-catch-plant-based-fish-sticks', 'https://goodcatchfoods.com/our-products/');
  setProductUrl('product-good-catch-plant-based-tuna', 'https://goodcatchfoods.com/our-products/');

  // ---- PHASE 1 DIETARY DATA BATCH 4 ----
  ['product-violife-just-like-cheddar-slices', 'product-violife-just-like-mozzarella-shreds'].forEach(id => addDietaryTags(id, ['soy-free', 'peanut-free', 'tree-nut-free'], 'Violife identifies these U.S. products as free from soy and nuts. Verify current packaging and note that the formula contains coconut oil.'));
  ['product-daiya-cheddar-style-shreds', 'product-daiya-mozzarella-style-shreds'].forEach(id => addDietaryTags(id, ['soy-free', 'peanut-free'], 'Daiya identifies its current dairy-free cheese range as soy-free and peanut-free. Tree-nut-free is not assigned because current product formulas include coconut oil and Daiya does not present tree-nut-free among the listed common-allergen claims.'));
  addDietaryTags('product-field-roast-creamy-original-chao-slices', ['peanut-free', 'tree-nut-free'], 'Field Roast declares soy and lists no peanut or tree-nut ingredients for Creamy Original Chao Slices. The formula contains coconut oil.');
  ['product-follow-your-heart-smoked-provolone-style-slices', 'product-follow-your-heart-parmesan-style-shreds'].forEach(id => addDietaryTags(id, ['soy-free', 'peanut-free', 'tree-nut-free'], 'Follow Your Heart identifies its current dairy-free cheeses as soy-free, and its product allergen chart lists these cheese categories as free of the major peanut and tree-nut allergens. Verify packaging.'));
  addDietaryTags('product-kite-hill-plain-plant-based-cream-cheese', ['soy-free', 'peanut-free'], 'Kite Hill states that its plain cream cheese is soy-free and lists almond as the relevant major allergen. Tree-nut-free is not assigned because it is almond-based.');
  addDietaryTags('product-tofutti-plain-dairy-free-cream-cheese', ['peanut-free', 'tree-nut-free'], 'Tofutti lists soy as the allergen for Better Than Cream Cheese Plain and lists no peanut or tree-nut ingredients. This is not a facility cross-contact guarantee.');
  addDietaryTags('product-country-crock-plant-butter-with-olive-oil', ['peanut-free', 'tree-nut-free'], 'Country Crock declares soy for Plant Butter with Olive Oil and lists no peanut or tree-nut ingredients. Pea protein may matter for some people with severe legume allergies.');
  addDietaryTags('product-miyoko-s-creamery-miyoko-s-european-style-plant-milk-butter', ['soy-free', 'peanut-free'], 'Miyoko’s states that it does not use soy, and the current European Style Plant Milk Butter formula lists cashew rather than peanut. Tree-nut-free is not assigned because the product contains cashews.');
  addDietaryTags('product-follow-your-heart-vegenaise-original', ['peanut-free', 'tree-nut-free'], 'Original Vegenaise contains soy protein. Follow Your Heart’s product and facility allergen information does not list peanut or tree-nut ingredients for this product; cross-contact controls are described separately.');
  addDietaryTags('product-hellmann-s-vegan-dressing-and-spread', ['soy-free', 'peanut-free', 'tree-nut-free'], 'The current U.S. Hellmann’s Plant Based Mayo ingredient list contains no soy, peanut, or tree-nut ingredients. This is an ingredient-list classification, not a facility guarantee.');

  setProductUrl('product-violife-just-like-cheddar-slices', 'https://www.violife.com/en-us/products');
  setProductUrl('product-violife-just-like-mozzarella-shreds', 'https://www.violife.com/en-us/products/dairy-free-cheese-shreds/just-like-mozzarella-shreds');
  setProductUrl('product-daiya-cheddar-style-shreds', 'https://daiyafoods.com/products/dairy-free-cheddar-shreds');
  setProductUrl('product-daiya-mozzarella-style-shreds', 'https://daiyafoods.com/pages/dietician-resources');
  setProductUrl('product-field-roast-creamy-original-chao-slices', 'https://fieldroast.com/product/creamy-original-chao-slices/');
  setProductUrl('product-follow-your-heart-smoked-provolone-style-slices', 'https://followyourheart.com/vegan-foods/dairy-free-cheese/');
  setProductUrl('product-follow-your-heart-parmesan-style-shreds', 'https://followyourheart.com/vegan-foods/dairy-free-cheese/');
  setProductUrl('product-kite-hill-plain-plant-based-cream-cheese', 'https://kite-hill.com/products/plain-cream-cheese');
  setProductUrl('product-tofutti-plain-dairy-free-cream-cheese', 'https://www.tofutti.com/better-than-cream-cheese-plain');
  setProductUrl('product-country-crock-plant-butter-with-olive-oil', 'https://www.countrycrock.com/en-us/our-products/plant-butter-cream/olive-sticks');
  setProductUrl('product-miyoko-s-creamery-miyoko-s-european-style-plant-milk-butter', 'https://www.miyokos.com/products/european-style-plant-milk-butter-salted');
  setProductUrl('product-follow-your-heart-vegenaise-original', 'https://followyourheart.com/vegan-foods/dairy-free-mayo/original-vegenaise/');
  setProductUrl('product-hellmann-s-vegan-dressing-and-spread', 'https://www.hellmanns.com/us/en/p/plant-based-mayo-spread-%26-dressing.html/00048001016637');

  // ---- PHASE 1 DIETARY DATA BATCH 5 ----
  ['product-daiya-vegan-mac-and-cheeze', 'product-daiya-plant-based-pepperoni-pizza'].forEach(id => addDietaryTags(id, ['soy-free', 'peanut-free'], 'Daiya identifies its current product range as soy-free and peanut-free. Tree-nut-free is not assigned because Daiya excludes coconut from its tree-nut allergen-control category and these prepared products can contain coconut-derived ingredients.'));
  addDietaryTags('product-amy-s-vegetable-pad-thai', ['peanut-free'], 'Amy’s current Vegetable Pad Thai allergen statement declares soy and tree nuts (cashews), with no peanut ingredient declared. Verify the exact package because Amy’s offers multiple sizes and formulas may change.');
  addDietaryTags('product-blackbird-foods-vegan-margherita-pizza', ['soy-free', 'peanut-free', 'tree-nut-free'], 'Blackbird’s current Margherita Pizza page declares wheat and states that it is manufactured in a facility using soy ingredients. The tags describe listed ingredients only; soy cross-contact is possible and current packaging must be checked.');

  setProductUrl('product-daiya-vegan-mac-and-cheeze', 'https://daiyafoods.com/pages/faq');
  setProductUrl('product-daiya-plant-based-pepperoni-pizza', 'https://daiyafoods.com/pages/faq');
  setProductUrl('product-amy-s-vegetable-pad-thai', 'https://www.amys.com/our-foods/pad-thai-family-size');
  setProductUrl('product-blackbird-foods-vegan-margherita-pizza', 'https://www.blackbirdfoods.com/margherita-pizza');

  // ---- PHASE 1 DIETARY DATA BATCH 6: homemade alternatives ----
  [
    'product-homemade-black-bean-burger',
    'product-homemade-lentil-burger',
    'product-homemade-sunflower-seed-cheese',
    'product-homemade-oat-milk',
    'product-homemade-flax-egg',
    'product-homemade-chia-egg',
    'product-homemade-aquafaba',
    'product-homemade-banana-nice-cream'
  ].forEach(id => addDietaryTags(id, ['soy-free', 'peanut-free', 'tree-nut-free'], 'The app’s stated homemade base recipe contains no soy, peanuts or tree nuts. Tags apply only when optional seasonings, sauces, mix-ins and toppings are also free of those allergens and cross-contact.'));

  [
    'product-homemade-walnut-lentil-taco-meat',
    'product-homemade-mushroom-walnut-ground',
    'product-homemade-cashew-cream-cheese'
  ].forEach(id => addDietaryTags(id, ['soy-free', 'peanut-free'], 'The stated homemade base recipe contains a tree nut (walnut or cashew), but no soy or peanut. Tags depend on every optional seasoning, sauce and addition remaining free of soy and peanut.'));

  addDietaryTags('product-homemade-tofu-scramble', ['peanut-free', 'tree-nut-free'], 'The stated base recipe contains soy tofu, but no peanut or tree nut. Tags depend on the seasonings, vegetables and optional additions used.');
  addDietaryTags('product-homemade-chickpea-salad', ['peanut-free', 'tree-nut-free'], 'The stated base uses chickpeas and vegan mayonnaise. Peanut and tree-nut tags require checking the chosen mayonnaise and additions; soy-free is not assigned because many vegan mayonnaise products can contain soy.');
  addDietaryTags('product-homemade-carrot-lox', ['peanut-free', 'tree-nut-free'], 'The carrot base contains no peanuts or tree nuts. Check every marinade ingredient and topping; soy-free is not assigned because common carrot-lox marinades may use soy sauce or tamari.');

  // ---- PHASE 1 DIETARY DATA BATCH 7: remaining commercial decisions ----
  ['product-just-egg-just-egg', 'product-just-egg-just-egg-folded'].forEach(id => addDietaryTags(id, ['soy-free', 'peanut-free', 'tree-nut-free'], 'JUST states that JUST Egg and JUST Egg Folded contain no ingredients from the nine major allergen categories. Review its facility and shared-line allergen chart and the current package for cross-contact needs.'));

  addDietaryTags('product-califia-farms-unsweetened-almondmilk', ['soy-free', 'peanut-free'], 'Califia’s current ingredient list contains almonds and no soy or peanut ingredients. It is not tree-nut-free, and Califia states that relevant facilities process tree nuts and may process soy.');

  [
    'product-so-delicious-unsweetened-coconutmilk',
    'product-so-delicious-french-vanilla-coconutmilk-creamer',
    'product-so-delicious-coconutmilk-yogurt-alternative',
    'product-so-delicious-coconutmilk-frozen-dessert'
  ].forEach(id => addDietaryTags(id, ['soy-free', 'peanut-free'], 'The named coconut-based product family uses coconut and the reviewed current examples list no soy or peanut ingredient. A tree-nut-free tag is not assigned because coconut allergy and labeling treatment require separate consideration; verify the exact flavor and package.'));

  addDietaryTags('product-so-delicious-cashewmilk-frozen-dessert', ['soy-free', 'peanut-free'], 'The product family is cashew-based and therefore not tree-nut-free. No soy or peanut claim should be relied upon without checking the exact flavor, but the tags describe the named base formula and must be verified on the package.');

  addDietaryTags('product-silk-original-almondmilk-creamer', ['soy-free', 'peanut-free'], 'This is an almond-based product and is not tree-nut-free. The soy-free and peanut-free tags describe the named formula only; verify the current ingredient and allergen statement because Silk formulas and shared-facility disclosures can change.');

  ['product-oatly-oat-creamer', 'product-oatly-oatmilk-yogurt-alternative'].forEach(id => addDietaryTags(id, [], 'No dietary claim assigned: these are broad or changing Oatly product-family records rather than exact current formulas. Replace them with flavor-specific records before adding soy-free, peanut-free or tree-nut-free tags.'));

  [
    'product-gardein-ultimate-plant-based-burger',
    'product-gardein-plant-based-ground',
    'product-gardein-ultimate-plant-based-chick-n-tenders',
    'product-gardein-seven-grain-crispy-tenders',
    'product-gardein-chick-n-scallopini',
    'product-gardein-mandarin-orange-crispy-chick-n',
    'product-gardein-f-sh-filets',
    'product-gardein-crabless-cakes'
  ].forEach(id => addDietaryTags(id, [], 'No dietary claim assigned: Gardein formulas differ substantially by product and package size, and an exact current manufacturer allergen statement was not confirmed for this record.'));

  addDietaryTags('product-dr-praeger-s-all-american-veggie-burgers', [], 'No dietary claim assigned until the exact current package ingredient and allergen statement is confirmed.');
  addDietaryTags('product-good-catch-plant-based-breaded-shrimp', [], 'No dietary claim assigned until the exact current package ingredient and allergen statement is confirmed.');
  addDietaryTags('product-earth-balance-original-buttery-spread', [], 'No soy-free, peanut-free or tree-nut-free claim assigned because the current manufacturer page did not expose a sufficiently specific allergen statement for this exact spread.');
  addDietaryTags('product-ben-and-jerry-s-non-dairy-frozen-dessert', [], 'No dietary claim assigned: this record represents multiple flavors with materially different soy, peanut and tree-nut ingredients. Replace it with flavor-specific records.');
  addDietaryTags('product-talenti-non-dairy-oatmilk-frozen-dessert', [], 'No dietary claim assigned. Current Talenti oatmilk gelato formulas reviewed list egg and soy, so this broad record is not a reliable vegan recommendation and must be replaced or removed.');

  const talentiRecord = products.find(p => p.id === 'product-talenti-non-dairy-oatmilk-frozen-dessert');
  if (talentiRecord) {
    talentiRecord.needsResearch = true;
    talentiRecord.verificationNote = 'Correction required: current Talenti oatmilk gelato listings reviewed contain egg and soy. Replace this broad record with a verified vegan flavor or remove it.';
    talentiRecord.productUrl = 'https://www.talentigelato.com/us/en/products/dairy-free-flavors.html';
  }
  setProductUrl('product-just-egg-just-egg', 'https://ju.st/allergy-friendly');
  setProductUrl('product-just-egg-just-egg-folded', 'https://ju.st/allergy-friendly');
  setProductUrl('product-califia-farms-unsweetened-almondmilk', 'https://www.califiafarms.com/products/unsweetened-almondmilk/');

  // ---- PHASE 1 NEEDS-RESEARCH CLEANUP ----
  const finalizeVerifiedProduct = (id, details) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    Object.assign(product, {
      needsResearch: false,
      productStatus: 'manufacturer-labeled-vegan',
      verificationScope: 'current-manufacturer-product-page',
      lastVerified: '2026-08-20'
    }, details || {});
  };

  finalizeVerifiedProduct('product-boca-original-vegan-veggie-burgers', {
    verificationNote: 'Kraft Heinz currently lists this exact Boca product. It contains soy and wheat; verify the current package for formulation and cross-contact changes.',
    availability: 'Current United States manufacturer product listing confirmed.'
  });
  finalizeVerifiedProduct('product-morningstar-farms-plant-based-chick-n-nuggets', {
    name: 'Chik’n Nuggets',
    base: 'Soy and wheat protein',
    verificationNote: 'MorningStar Farms currently labels this product vegan and lists soy and wheat ingredients. Check the current package and SmartLabel before purchase.',
    availability: 'Current United States manufacturer product listing confirmed.'
  });
  finalizeVerifiedProduct('product-abbot-s-plant-based-chick-n-pieces', {
    name: 'Chopped Chick’n',
    verificationNote: 'Abbot’s currently lists Chopped Chick’n and states that its plant-based meats are free from the top eight allergens, including soy, peanuts and tree nuts. People with severe peanut allergy should discuss possible pea-protein cross-reactivity with a clinician.',
    availability: 'Current manufacturer product range confirmed.',
    productUrl: 'https://abbots.com/'
  });
  finalizeVerifiedProduct('product-amy-s-vegetable-pad-thai', {
    verificationNote: 'Amy’s current family-size Vegetable Pad Thai page declares soy and tree nuts (cashews). No peanut ingredient is declared; verify that the package size matches this listing.',
    availability: 'Current manufacturer product listing confirmed.'
  });
  finalizeVerifiedProduct('product-blackbird-foods-vegan-margherita-pizza', {
    verificationNote: 'Blackbird’s current Margherita Pizza listing declares wheat and notes manufacture in a facility using soy ingredients. Dietary tags describe listed ingredients only; soy cross-contact is possible.',
    availability: 'Current manufacturer product listing confirmed.'
  });

  [
    'product-good-catch-plant-based-breaded-shrimp',
    'product-talenti-non-dairy-oatmilk-frozen-dessert'
  ].forEach(id => {
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) products.splice(index, 1);
  });

  // Hero photo: Prateek Lall on Pexels, photo 38539256, Pexels License.
  // ---- Hybrid exact-image system ----
  // Do not assign category-level stand-ins. An image is displayed only when it
  // represents this exact record and its source page is recorded alongside it.
  [...products, ...recipes, ...animals, ...resources].forEach(item => {
    delete item.imageUrl;
    delete item.imagePage;
    delete item.imageCredit;
    delete item.imageStatus;
  });

  const setExactImage = (collection, id, image) => {
    const item = collection.find(entry => entry.id === id);
    if (item) Object.assign(item, image, { imageStatus: 'exact' });
  };

  setExactImage(products, 'product-beyond-meat-beyond-burger', {
    imageUrl: 'imgs/products/product-beyond-meat-beyond-burger.jpg',
    imagePage: 'https://www.beyondmeat.com/en-US/products/the-beyond-burger',
    imageCredit: 'Beyond Meat · official product image',
    productUrl: 'https://www.beyondmeat.com/en-US/products/the-beyond-burger'
  });
  setExactImage(products, 'product-oatly-vanilla-frozen-dessert', {
    imageUrl: 'imgs/products/product-oatly-vanilla-frozen-dessert.jpg',
    imagePage: 'https://www.oatly.com/en-us/products/frozen-dessert/frozen-dessert-vanilla-16-oz',
    imageCredit: 'Oatly · official product image',
    productUrl: 'https://www.oatly.com/en-us/products/frozen-dessert/frozen-dessert-vanilla-16-oz'
  });
  setExactImage(products, 'product-oatly-chocolate-frozen-dessert', {
    imageUrl: 'imgs/products/product-oatly-chocolate-frozen-dessert.jpg',
    imagePage: 'https://www.oatly.com/en-us/products/frozen-dessert/frozen-dessert-chocolate-16-oz',
    imageCredit: 'Oatly · official product image',
    productUrl: 'https://www.oatly.com/en-us/products/frozen-dessert/frozen-dessert-chocolate-16-oz'
  });
  setExactImage(products, 'product-silk-original-soymilk', {
    imageUrl: 'imgs/products/product-silk-original-soymilk.jpg',
    imagePage: 'https://silk.com/plant-based-products/soymilk/original-soymilk/',
    imageCredit: 'Silk · official product image',
    productUrl: 'https://silk.com/plant-based-products/soymilk/original-soymilk/'
  });
  setExactImage(products, 'product-silk-unsweet-soymilk', {
    imageUrl: 'imgs/products/product-silk-unsweet-soymilk.jpg',
    imagePage: 'https://silk.com/plant-based-products/soymilk/unsweet-soymilk/',
    imageCredit: 'Silk · official product image',
    productUrl: 'https://silk.com/plant-based-products/soymilk/unsweet-soymilk/'
  });
  setExactImage(products, 'product-oatly-original-oatmilk', {
    imageUrl: 'imgs/products/product-oatly-original-oatmilk.jpg',
    imagePage: 'https://www.oatly.com/en-us/products/chilled-oatmilk/chilled-oatmilk-64-oz',
    imageCredit: 'Oatly · official product image',
    productUrl: 'https://www.oatly.com/en-us/products/chilled-oatmilk/chilled-oatmilk-64-oz'
  });
  setExactImage(products, 'product-oatly-barista-edition-oatmilk', {
    imageUrl: 'imgs/products/product-oatly-barista-edition-oatmilk.jpg',
    imagePage: 'https://www.oatly.com/en-us/products/chilled-oatmilk/chilled-oatmilk-barista-edition-64-oz',
    imageCredit: 'Oatly · official product image',
    productUrl: 'https://www.oatly.com/en-us/products/chilled-oatmilk/chilled-oatmilk-barista-edition-64-oz'
  });
  setExactImage(products, 'product-oatly-oat-creamer', {
    imageUrl: 'imgs/products/product-oatly-oat-creamer.jpg',
    imagePage: 'https://www.oatly.com/en-us/products/creamer/oatmilk-creamer-sweet-creamy-32-oz',
    imageCredit: 'Oatly · official product image',
    productUrl: 'https://www.oatly.com/en-us/products/creamer/oatmilk-creamer-sweet-creamy-32-oz'
  });
  setExactImage(products, 'product-beyond-meat-beyond-beef', {
    imageUrl: 'imgs/products/product-beyond-meat-beyond-beef.jpg',
    imagePage: 'https://www.beyondmeat.com/en-US/products/beyond-beef',
    imageCredit: 'Beyond Meat · official product image',
    productUrl: 'https://www.beyondmeat.com/en-US/products/beyond-beef'
  });
  setExactImage(products, 'product-beyond-meat-original-breakfast-sausage-patties', {
    imageUrl: 'imgs/products/product-beyond-meat-original-breakfast-sausage-patties.jpg',
    imagePage: 'https://www.beyondmeat.com/en-US/products/beyond-breakfast-sausage/original-patties',
    imageCredit: 'Beyond Meat · official product image',
    productUrl: 'https://www.beyondmeat.com/en-US/products/beyond-breakfast-sausage/original-patties'
  });
  setExactImage(products, 'product-silk-original-almondmilk-creamer', {
    name: 'Sweet & Creamy Almond Creamer',
    imageUrl: 'imgs/products/product-silk-original-almondmilk-creamer.jpg',
    imagePage: 'https://silk.com/plant-based-products/creamer/sweet-and-creamy-almond-creamer/',
    imageCredit: 'Silk · official product image',
    productUrl: 'https://silk.com/plant-based-products/creamer/sweet-and-creamy-almond-creamer/'
  });
  setExactImage(products, 'product-silk-soymilk-yogurt-alternative', {
    name: 'Vanilla Protein Dairy-Free Yogurt',
    imageUrl: 'imgs/products/product-silk-soymilk-yogurt-alternative.jpg',
    imagePage: 'https://silk.com/plant-based-products/dairy-free-yogurt-alternatives/vanilla-protein-dairy-free-yogurt-alternative/',
    imageCredit: 'Silk · official product image',
    productUrl: 'https://silk.com/plant-based-products/dairy-free-yogurt-alternatives/vanilla-protein-dairy-free-yogurt-alternative/'
  });

  setExactImage(resources, 'resource-earthlings', {
    imageUrl: 'imgs/resources/resource-earthlings.jpg',
    imagePage: 'https://www.nationearth.com/',
    imageCredit: 'Nation Earth · official Earthlings artwork'
  });
  setExactImage(resources, 'resource-cowspiracy', {
    imageUrl: 'imgs/resources/resource-cowspiracy.jpg',
    imagePage: 'https://www.cowspiracy.com/',
    imageCredit: 'Cowspiracy · official film artwork'
  });
  setExactImage(resources, 'resource-ted-melanie-joy', {
    imageUrl: 'imgs/resources/resource-ted-melanie-joy.jpg',
    imagePage: 'https://www.youtube.com/watch?v=o0VrZPBskpg',
    imageCredit: 'TEDx · official video thumbnail'
  });

  const resourceTitleCard = (title, source, accent, symbol) => {
    const safe = value => String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
    })[character]);
    const words = String(title).split(/\s+/);
    const lines = [];
    words.forEach(word => {
      const last = lines[lines.length - 1] || '';
      if (!last || (last + ' ' + word).length > 28) lines.push(word);
      else lines[lines.length - 1] = last + ' ' + word;
    });
    const titleLines = lines.slice(0, 3).map((line, index) =>
      `<tspan x="72" dy="${index === 0 ? 0 : 74}">${safe(line)}</tspan>`
    ).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
      <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#10261f"/><stop offset="1" stop-color="#1f4a3c"/></linearGradient></defs>
      <rect width="1200" height="675" rx="36" fill="url(#bg)"/>
      <circle cx="1020" cy="110" r="230" fill="${safe(accent)}" opacity=".18"/>
      <circle cx="1080" cy="580" r="300" fill="${safe(accent)}" opacity=".10"/>
      <rect x="72" y="72" width="112" height="112" rx="28" fill="${safe(accent)}"/>
      <text x="128" y="145" text-anchor="middle" font-family="Arial,sans-serif" font-size="58" font-weight="700" fill="#10261f">${safe(symbol)}</text>
      <text x="72" y="245" font-family="Arial,sans-serif" font-size="28" font-weight="700" letter-spacing="3" fill="${safe(accent)}">${safe(source.toUpperCase())}</text>
      <text x="72" y="355" font-family="Arial,sans-serif" font-size="62" font-weight="700" fill="#fff">${titleLines}</text>
      <rect x="72" y="605" width="180" height="8" rx="4" fill="${safe(accent)}"/>
    </svg>`;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  };
  const titleCardVisual = (title, source, accent, symbol, imagePage) => ({
    imageUrl: resourceTitleCard(title, source, accent, symbol),
    imagePage,
    imageCredit: `Go Vegan original resource card · ${source}`
  });

  setExactImage(resources, 'resource-dominion', titleCardVisual(
    'Dominion', 'Dominion Movement', '#d96c5a', 'D', 'https://www.dominionmovement.com/watch'
  ));
  setExactImage(resources, 'resource-vegan-society-guide', titleCardVisual(
    'How to Go Vegan', 'The Vegan Society', '#7ba98a', 'VS', 'https://www.vegansociety.com/go-vegan/how-go-vegan'
  ));
  setExactImage(resources, 'resource-pcrm-starter-kit', titleCardVisual(
    'Vegan Starter Kit', 'Physicians Committee', '#d4a853', 'P', 'https://www.pcrm.org/veganstarterkit'
  ));
  setExactImage(resources, 'resource-vegan-starter-book', titleCardVisual(
    'The Vegan Starter Kit', 'Neal Barnard, MD', '#e7b85a', 'NB', 'https://www.pcrm.org/theveganstarterkit'
  ));
  setExactImage(resources, 'resource-animal-liberation-now', titleCardVisual(
    'Animal Liberation Now', 'Peter Singer', '#e88970', 'PS', 'https://www.harpercollins.com/products/animal-liberation-now-peter-singer'
  ));
  setExactImage(resources, 'resource-why-we-love-dogs', {
    imageUrl: 'imgs/resources/resource-why-we-love-dogs.jpg',
    imagePage: 'https://carnism.org/book/why-we-love-dogs-eat-pigs-and-wear-cows/',
    imageCredit: 'Beyond Carnism · official book image'
  });
  setExactImage(resources, 'resource-nih-b12', titleCardVisual(
    'Vitamin B12 Fact Sheet', 'NIH Office of Dietary Supplements', '#68aee8', 'B12', 'https://ods.od.nih.gov/factsheets/VitaminB12-Consumer/'
  ));
  setExactImage(resources, 'resource-vegan-society-nutrition', titleCardVisual(
    'Vegan Nutrition Overview', 'The Vegan Society', '#83c790', 'N', 'https://www.vegansociety.com/resources/nutrition-and-health/nutrition-overview'
  ));
  setExactImage(resources, 'resource-owid-food-impact', {
    imageUrl: 'imgs/resources/resource-owid-food-impact.jpg',
    imagePage: 'https://ourworldindata.org/environmental-impacts-of-food',
    imageCredit: 'Our World in Data · article chart'
  });
  setExactImage(resources, 'resource-food-footprints', titleCardVisual(
    'Food Footprints Data Explorer', 'Our World in Data', '#6eb5d8', 'DATA', 'https://ourworldindata.org/explorers/food-footprints'
  ));
  setExactImage(resources, 'resource-our-hen-house', {
    imageUrl: 'imgs/resources/resource-our-hen-house.jpg',
    imagePage: 'https://www.ourhenhouse.org/',
    imageCredit: 'Our Hen House · official logo'
  });
  setExactImage(resources, 'resource-farm-sanctuary', {
    imageUrl: 'imgs/resources/resource-farm-sanctuary.jpg',
    imagePage: 'https://www.farmsanctuary.org/',
    imageCredit: 'Farm Sanctuary · official homepage photograph'
  });
  setExactImage(resources, 'resource-animal-ethics', titleCardVisual(
    'Animal Ethics', 'Animal Ethics', '#c8df64', 'AE', 'https://www.animal-ethics.org/'
  ));

  const resourceFallbackAccents = ['#7ba98a', '#d4a853', '#d96c5a', '#68aee8', '#c8df64', '#e88970'];
  resources.forEach((resource, index) => {
    const initials = String(resource.title || 'Resource').split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
    resource.fallbackImageUrl = resourceTitleCard(
      resource.title,
      resource.creator || resource.category || 'Go Vegan Resource',
      resourceFallbackAccents[index % resourceFallbackAccents.length],
      initials
    );
  });
  const embeddedResourceImages = {"resource-dominion":"imgs/resources/resource-dominion.jpg","resource-earthlings":"imgs/resources/resource-earthlings.jpg","resource-cowspiracy":"imgs/resources/resource-cowspiracy.jpg","resource-vegan-society-guide":"imgs/resources/resource-vegan-society-guide.jpg","resource-pcrm-starter-kit":"imgs/resources/resource-pcrm-starter-kit.jpg","resource-vegan-starter-book":"imgs/resources/resource-vegan-starter-book.jpg","resource-animal-liberation-now":"imgs/resources/resource-animal-liberation-now.jpg","resource-why-we-love-dogs":"imgs/resources/resource-why-we-love-dogs.jpg","resource-nih-b12":"imgs/resources/resource-nih-b12.jpg","resource-vegan-society-nutrition":"imgs/resources/resource-vegan-society-nutrition.jpg","resource-owid-food-impact":"imgs/resources/resource-owid-food-impact.jpg","resource-food-footprints":"imgs/resources/resource-food-footprints.jpg","resource-ted-melanie-joy":"imgs/resources/resource-ted-melanie-joy.jpg","resource-our-hen-house":"imgs/resources/resource-our-hen-house.jpg","resource-farm-sanctuary":"imgs/resources/resource-farm-sanctuary.jpg","resource-animal-ethics":"imgs/resources/resource-animal-ethics.jpg"};
  resources.forEach(resource => {
    const embeddedImage = embeddedResourceImages[resource.id];
    if (!embeddedImage) return;
    resource.imageUrl = embeddedImage;
    resource.fallbackImageUrl = embeddedImage;
    resource.imageStorage = 'embedded';
  });
  const originalResourceArtworkIds = new Set([
    'resource-vegan-society-guide', 'resource-pcrm-starter-kit', 'resource-vegan-starter-book',
    'resource-animal-liberation-now', 'resource-nih-b12', 'resource-vegan-society-nutrition',
    'resource-food-footprints', 'resource-ted-melanie-joy', 'resource-animal-ethics'
  ]);
  resources.forEach(resource => {
    resource.imageRightsBasis = originalResourceArtworkIds.has(resource.id)
      ? 'original-go-vegan-artwork'
      : 'official-source-promotional-or-editorial-thumbnail';
  });
  const dominionResource = resources.find(resource => resource.id === 'resource-dominion');
  if (dominionResource) {
    dominionResource.imagePage = 'https://www.dominionmovement.com/host-screening';
    dominionResource.imageCredit = 'Dominion Movement · official promotional poster';
    dominionResource.imageRightsBasis = 'official-poster-provided-with-screening-promotional-resources';
  }
  const tedResource = resources.find(resource => resource.id === 'resource-ted-melanie-joy');
  if (tedResource) tedResource.imageCredit = 'Go Vegan original resource card · TEDx talk title and source';

  // Embedded exact product visuals, official thumbnails, and original catalog cards.
  const embeddedProductImages = {"product-impossible-foods-impossible-beef-made-from-plants":{"dataUrl":"imgs/products/product-impossible-foods-impossible-beef-made-from-plants.jpg","imageAlt":"Impossible Foods Impossible Beef Made From Plants product visual","imagePage":"https://impossiblefoods.com/","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-impossible-foods-impossible-burger-patties":{"dataUrl":"imgs/products/product-impossible-foods-impossible-burger-patties.jpg","imageAlt":"Impossible Foods Impossible Burger Patties product visual","imagePage":"https://impossiblefoods.com/","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-beyond-meat-beyond-burger":{"dataUrl":"imgs/products/product-beyond-meat-beyond-burger.jpg","imagePage":"https://www.beyondmeat.com/en-US/products/the-beyond-burger","imageCredit":"Beyond Meat · official-source product image","imageAlt":"Beyond Meat Beyond Burger product visual","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.beyondmeat.com/en-US/products/the-beyond-burger","imageRightsBasis":"official-source-identification-thumbnail"},"product-beyond-meat-beyond-beef":{"dataUrl":"imgs/products/product-beyond-meat-beyond-beef.jpg","imagePage":"https://www.beyondmeat.com/en-US/products/beyond-beef","imageCredit":"Beyond Meat · official-source product image","imageAlt":"Beyond Meat Beyond Beef product visual","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.beyondmeat.com/en-US/products/beyond-beef","imageRightsBasis":"official-source-identification-thumbnail"},"product-beyond-meat-beyond-meatballs":{"dataUrl":"imgs/products/product-beyond-meat-beyond-meatballs.jpg","imageAlt":"Beyond Meat Beyond Meatballs product visual","imagePage":"https://www.beyondmeat.com/en-US/products/","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-gardein-ultimate-plant-based-burger":{"dataUrl":"imgs/products/product-gardein-ultimate-plant-based-burger.jpg","imageAlt":"Gardein Ultimate Plant-Based Burger product visual","imagePage":"https://www.gardein.com/","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-dr-praeger-s-all-american-veggie-burgers":{"dataUrl":"imgs/products/product-dr-praeger-s-all-american-veggie-burgers.jpg","imageAlt":"Dr. Praeger’s All American Veggie Burgers product visual","imagePage":"https://www.drpraegers.com/products/all-american-drive-thru-burger","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-boca-original-vegan-veggie-burgers":{"dataUrl":"imgs/products/product-boca-original-vegan-veggie-burgers.jpg","imageAlt":"Boca Original Vegan Veggie Burgers product visual","imagePage":"https://www.kraftheinz.com/boca/products/00759283334455-original-vegan-veggie-burgers","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-gardein-plant-based-ground":{"dataUrl":"imgs/products/product-gardein-plant-based-ground.jpg","imageAlt":"Gardein Plant-Based Ground product visual","imagePage":"https://www.gardein.com/","imageCredit":"Gardein · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.gardein.com/","imageRightsBasis":"official-source-identification-thumbnail"},"product-meati-plant-based-steak":{"dataUrl":"imgs/products/product-meati-plant-based-steak.jpg","imageAlt":"Meati Plant-Based Steak product visual","imagePage":"https://www.meati.com/pages/faqs","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-impossible-foods-impossible-chicken-nuggets-made-from-plants":{"dataUrl":"imgs/products/product-impossible-foods-impossible-chicken-nuggets-made-from-plants.jpg","imageAlt":"Impossible Foods Impossible Chicken Nuggets Made From Plants product visual","imagePage":"https://impossiblefoods.com/","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-beyond-meat-beyond-chicken-tenders":{"dataUrl":"imgs/products/product-beyond-meat-beyond-chicken-tenders.jpg","imageAlt":"Beyond Meat Beyond Chicken Tenders product visual","imagePage":"https://www.beyondmeat.com/en-US/products/","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-gardein-ultimate-plant-based-chick-n-tenders":{"dataUrl":"imgs/products/product-gardein-ultimate-plant-based-chick-n-tenders.jpg","imageAlt":"Gardein Ultimate Plant-Based Chick’n Tenders product visual","imagePage":"https://www.gardein.com/","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-gardein-seven-grain-crispy-tenders":{"dataUrl":"imgs/products/product-gardein-seven-grain-crispy-tenders.jpg","imageAlt":"Gardein Seven Grain Crispy Tenders product visual","imagePage":"https://www.gardein.com/","imageCredit":"Gardein · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.gardein.com/","imageRightsBasis":"official-source-identification-thumbnail"},"product-gardein-chick-n-scallopini":{"dataUrl":"imgs/products/product-gardein-chick-n-scallopini.jpg","imageAlt":"Gardein Chick’n Scallopini product visual","imagePage":"https://www.gardein.com/","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-gardein-mandarin-orange-crispy-chick-n":{"dataUrl":"imgs/products/product-gardein-mandarin-orange-crispy-chick-n.jpg","imageAlt":"Gardein Mandarin Orange Crispy Chick’n product visual","imagePage":"https://www.gardein.com/chickn-and-turky/classics/plant-based-mandarin-orange-crispy-chickn","imageCredit":"Gardein · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.gardein.com/chickn-and-turky/classics/plant-based-mandarin-orange-crispy-chickn","imageRightsBasis":"official-source-identification-thumbnail"},"product-morningstar-farms-plant-based-chick-n-nuggets":{"dataUrl":"imgs/products/product-morningstar-farms-plant-based-chick-n-nuggets.jpg","imageAlt":"MorningStar Farms Chik’n Nuggets product visual","imagePage":"https://www.morningstarfarms.com/en_US/products/chikn/morningstar-farms-chik-n-nuggets-product.html","imageCredit":"MorningStar Farms · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.morningstarfarms.com/en_US/products/chikn/morningstar-farms-chik-n-nuggets-product.html","imageRightsBasis":"official-source-identification-thumbnail"},"product-daring-original-chick-n-tenders":{"dataUrl":"imgs/products/product-daring-original-chick-n-tenders.jpg","imageAlt":"Daring Original Chick’n Tenders product visual","imagePage":"https://daring.com/faq/","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-abbot-s-plant-based-chick-n-pieces":{"dataUrl":"imgs/products/product-abbot-s-plant-based-chick-n-pieces.jpg","imageAlt":"Abbot’s Chopped Chick’n product visual","imagePage":"https://abbots.com/","imageCredit":"Abbot’s · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://abbots.com/","imageRightsBasis":"official-source-identification-thumbnail"},"product-tofurky-hickory-smoked-plant-based-deli-slices":{"dataUrl":"imgs/products/product-tofurky-hickory-smoked-plant-based-deli-slices.jpg","imageAlt":"Tofurky Hickory Smoked Plant-Based Deli Slices product visual","imagePage":"https://tofurky.com/what-we-make/deli-slices/hickory-smoked/","imageCredit":"Tofurky · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://tofurky.com/what-we-make/deli-slices/hickory-smoked/","imageRightsBasis":"official-source-identification-thumbnail"},"product-tofurky-oven-roasted-plant-based-deli-slices":{"dataUrl":"imgs/products/product-tofurky-oven-roasted-plant-based-deli-slices.jpg","imageAlt":"Tofurky Oven Roasted Plant-Based Deli Slices product visual","imagePage":"https://tofurky.com/what-we-make/deli-slices/roasted-turky/","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-beyond-meat-beyond-sausage-hot-italian":{"dataUrl":"imgs/products/product-beyond-meat-beyond-sausage-hot-italian.jpg","imageAlt":"Beyond Meat Beyond Sausage Hot Italian product visual","imagePage":"https://www.beyondmeat.com/en-US/products/","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-beyond-meat-beyond-sausage-brat-original":{"dataUrl":"imgs/products/product-beyond-meat-beyond-sausage-brat-original.jpg","imageAlt":"Beyond Meat Beyond Sausage Brat Original product visual","imagePage":"https://www.beyondmeat.com/en-US/products/","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-field-roast-italian-garlic-and-fennel-plant-based-sausage":{"dataUrl":"imgs/products/product-field-roast-italian-garlic-and-fennel-plant-based-sausage.jpg","imageAlt":"Field Roast Italian Garlic & Fennel Plant-Based Sausage product visual","imagePage":"https://fieldroast.com/product/italian-sausage/","imageCredit":"Field Roast · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://fieldroast.com/product/italian-sausage/","imageRightsBasis":"official-source-identification-thumbnail"},"product-field-roast-smoked-apple-and-sage-plant-based-sausage":{"dataUrl":"imgs/products/product-field-roast-smoked-apple-and-sage-plant-based-sausage.jpg","imageAlt":"Field Roast Smoked Apple & Sage Plant-Based Sausage product visual","imagePage":"https://fieldroast.com/product/smoked-apple-sage-sausage/","imageCredit":"Field Roast · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://fieldroast.com/product/smoked-apple-sage-sausage/","imageRightsBasis":"official-source-identification-thumbnail"},"product-lightlife-smart-dogs":{"dataUrl":"imgs/products/product-lightlife-smart-dogs.jpg","imageAlt":"Lightlife Smart Dogs product visual","imagePage":"https://lightlife.com/product/smart-dogs/","imageCredit":"Lightlife · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://lightlife.com/product/smart-dogs/","imageRightsBasis":"official-source-identification-thumbnail"},"product-field-roast-frankfurters":{"dataUrl":"imgs/products/product-field-roast-frankfurters.jpg","imageAlt":"Field Roast Frankfurters product visual","imagePage":"https://fieldroast.com/product/frankfurters/","imageCredit":"Field Roast · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://fieldroast.com/product/frankfurters/","imageRightsBasis":"official-source-identification-thumbnail"},"product-lightlife-smart-bacon":{"dataUrl":"imgs/products/product-lightlife-smart-bacon.jpg","imageAlt":"Lightlife Smart Bacon product visual","imagePage":"https://lightlife.com/product/smart-bacon/","imageCredit":"Lightlife · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://lightlife.com/product/smart-bacon/","imageRightsBasis":"official-source-identification-thumbnail"},"product-lightlife-smoky-tempeh-strips":{"dataUrl":"imgs/products/product-lightlife-smoky-tempeh-strips.jpg","imageAlt":"Lightlife Smoky Tempeh Strips product visual","imagePage":"https://lightlife.com/product/smoky-tempeh-strips/","imageCredit":"Lightlife · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://lightlife.com/product/smoky-tempeh-strips/","imageRightsBasis":"official-source-identification-thumbnail"},"product-impossible-foods-plant-based-breakfast-sausage-patties":{"dataUrl":"imgs/products/product-impossible-foods-plant-based-breakfast-sausage-patties.jpg","imageAlt":"Impossible Foods Plant-Based Breakfast Sausage Patties product visual","imagePage":"https://impossiblefoods.com/","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-beyond-meat-original-breakfast-sausage-patties":{"dataUrl":"imgs/products/product-beyond-meat-original-breakfast-sausage-patties.jpg","imagePage":"https://www.beyondmeat.com/en-US/products/beyond-breakfast-sausage/original-patties","imageCredit":"Beyond Meat · official-source product image","imageAlt":"Beyond Meat Original Breakfast Sausage Patties product visual","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.beyondmeat.com/en-US/products/beyond-breakfast-sausage/original-patties","imageRightsBasis":"official-source-identification-thumbnail"},"product-gardein-f-sh-filets":{"dataUrl":"imgs/products/product-gardein-f-sh-filets.jpg","imageAlt":"Gardein F’sh Filets product visual","imagePage":"https://www.gardein.com/fishless/plant-based-fsh-filets","imageCredit":"Gardein · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.gardein.com/fishless/plant-based-fsh-filets","imageRightsBasis":"official-source-identification-thumbnail"},"product-gardein-crabless-cakes":{"dataUrl":"imgs/products/product-gardein-crabless-cakes.jpg","imageAlt":"Gardein Crabless Cakes product visual","imagePage":"https://www.gardein.com/","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-good-catch-plant-based-fish-sticks":{"dataUrl":"imgs/products/product-good-catch-plant-based-fish-sticks.jpg","imageAlt":"Good Catch Plant-Based Fish Sticks product visual","imagePage":"https://goodcatchfoods.com/our-products/","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-good-catch-plant-based-tuna":{"dataUrl":"imgs/products/product-good-catch-plant-based-tuna.jpg","imageAlt":"Good Catch Plant-Based Tuna product visual","imagePage":"https://goodcatchfoods.com/our-products/","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-silk-original-soymilk":{"dataUrl":"imgs/products/product-silk-original-soymilk.jpg","imagePage":"https://silk.com/plant-based-products/soymilk/original-soymilk/","imageCredit":"Silk · official-source product image","imageAlt":"Silk Original Soymilk product visual","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://silk.com/plant-based-products/soymilk/original-soymilk/","imageRightsBasis":"official-source-identification-thumbnail"},"product-silk-unsweet-soymilk":{"dataUrl":"imgs/products/product-silk-unsweet-soymilk.jpg","imagePage":"https://silk.com/plant-based-products/soymilk/unsweet-soymilk/","imageCredit":"Silk · official-source product image","imageAlt":"Silk Unsweet Soymilk product visual","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://silk.com/plant-based-products/soymilk/unsweet-soymilk/","imageRightsBasis":"official-source-identification-thumbnail"},"product-oatly-original-oatmilk":{"dataUrl":"imgs/products/product-oatly-original-oatmilk.jpg","imagePage":"https://www.oatly.com/en-us/products/chilled-oatmilk/chilled-oatmilk-64-oz","imageCredit":"Oatly · official-source product image","imageAlt":"Oatly Original Oatmilk product visual","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.oatly.com/en-us/products/chilled-oatmilk/chilled-oatmilk-64-oz","imageRightsBasis":"official-source-identification-thumbnail"},"product-oatly-barista-edition-oatmilk":{"dataUrl":"imgs/products/product-oatly-barista-edition-oatmilk.jpg","imagePage":"https://www.oatly.com/en-us/products/chilled-oatmilk/chilled-oatmilk-barista-edition-64-oz","imageCredit":"Oatly · official-source product image","imageAlt":"Oatly Barista Edition Oatmilk product visual","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.oatly.com/en-us/products/chilled-oatmilk/chilled-oatmilk-barista-edition-64-oz","imageRightsBasis":"official-source-identification-thumbnail"},"product-planet-oat-original-oatmilk":{"dataUrl":"imgs/products/product-planet-oat-original-oatmilk.jpg","imageAlt":"Planet Oat Original Oatmilk product visual","imagePage":"https://planetoat.com/","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-almond-breeze-unsweetened-almondmilk":{"dataUrl":"imgs/products/product-almond-breeze-unsweetened-almondmilk.jpg","imageAlt":"Almond Breeze Unsweetened Almondmilk product visual","imagePage":"https://www.bluediamond.com/brand/almond-breeze/refrigerated-almondmilk/unsweetened-original/","imageCredit":"Almond Breeze · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.bluediamond.com/brand/almond-breeze/refrigerated-almondmilk/unsweetened-original/","imageRightsBasis":"official-source-identification-thumbnail"},"product-califia-farms-unsweetened-almondmilk":{"dataUrl":"imgs/products/product-califia-farms-unsweetened-almondmilk.jpg","imageAlt":"Califia Farms Unsweetened Almondmilk product visual","imagePage":"https://www.califiafarms.com/products/unsweetened-almondmilk/","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-ripple-ripple-original-plant-based-milk":{"dataUrl":"imgs/products/product-ripple-ripple-original-plant-based-milk.jpg","imageAlt":"Ripple Ripple Original Plant-Based Milk product visual","imagePage":"https://ripplefoods.com/products/ripple-shelf-stable-original-milk-6-pack","imageCredit":"Ripple · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://ripplefoods.com/products/ripple-shelf-stable-original-milk-6-pack","imageRightsBasis":"official-source-identification-thumbnail"},"product-so-delicious-unsweetened-coconutmilk":{"dataUrl":"imgs/products/product-so-delicious-unsweetened-coconutmilk.jpg","imageAlt":"So Delicious Unsweetened Coconutmilk product visual","imagePage":"https://sodeliciousdairyfree.com/about-us/faqs","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-good-karma-flaxmilk":{"dataUrl":"imgs/products/product-good-karma-flaxmilk.jpg","imageAlt":"Good Karma Flaxmilk product visual","imagePage":"https://goodkarmafoods.com/pages/allergen-free","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-oatly-oat-creamer":{"dataUrl":"imgs/products/product-oatly-oat-creamer.jpg","imagePage":"https://www.oatly.com/en-us/products/creamer/oatmilk-creamer-sweet-creamy-32-oz","imageCredit":"Oatly · official-source product image","imageAlt":"Oatly Oat Creamer product visual","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.oatly.com/en-us/products/creamer/oatmilk-creamer-sweet-creamy-32-oz","imageRightsBasis":"official-source-identification-thumbnail"},"product-califia-farms-oat-barista-blend":{"dataUrl":"imgs/products/product-califia-farms-oat-barista-blend.jpg","imageAlt":"Califia Farms Oat Barista Blend product visual","imagePage":"https://www.califiafarms.com/products/oat-barista-blend/","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-silk-original-almondmilk-creamer":{"dataUrl":"imgs/products/product-silk-original-almondmilk-creamer.jpg","imagePage":"https://silk.com/plant-based-products/creamer/sweet-and-creamy-almond-creamer/","imageCredit":"Silk · official-source product image","imageAlt":"Silk Sweet & Creamy Almond Creamer product visual","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://silk.com/plant-based-products/creamer/sweet-and-creamy-almond-creamer/","imageRightsBasis":"official-source-identification-thumbnail"},"product-so-delicious-french-vanilla-coconutmilk-creamer":{"dataUrl":"imgs/products/product-so-delicious-french-vanilla-coconutmilk-creamer.jpg","imageAlt":"So Delicious French Vanilla Coconutmilk Creamer product visual","imagePage":"https://sodeliciousdairyfree.com/about-us/faqs","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-violife-just-like-cheddar-slices":{"dataUrl":"imgs/products/product-violife-just-like-cheddar-slices.jpg","imageAlt":"Violife Just Like Cheddar Slices product visual","imagePage":"https://www.violife.com/en-us/products","imageCredit":"Violife · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.violife.com/en-us/products","imageRightsBasis":"official-source-identification-thumbnail"},"product-violife-just-like-mozzarella-shreds":{"dataUrl":"imgs/products/product-violife-just-like-mozzarella-shreds.jpg","imageAlt":"Violife Just Like Mozzarella Shreds product visual","imagePage":"https://www.violife.com/en-us/products/dairy-free-cheese-shreds/just-like-mozzarella-shreds","imageCredit":"Violife · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.violife.com/en-us/products/dairy-free-cheese-shreds/just-like-mozzarella-shreds","imageRightsBasis":"official-source-identification-thumbnail"},"product-daiya-cheddar-style-shreds":{"dataUrl":"imgs/products/product-daiya-cheddar-style-shreds.jpg","imageAlt":"Daiya Cheddar Style Shreds product visual","imagePage":"https://daiyafoods.com/products/dairy-free-cheddar-shreds","imageCredit":"Daiya · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://daiyafoods.com/products/dairy-free-cheddar-shreds","imageRightsBasis":"official-source-identification-thumbnail"},"product-daiya-mozzarella-style-shreds":{"dataUrl":"imgs/products/product-daiya-mozzarella-style-shreds.jpg","imageAlt":"Daiya Mozzarella Style Shreds product visual","imagePage":"https://daiyafoods.com/pages/dietician-resources","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-field-roast-creamy-original-chao-slices":{"dataUrl":"imgs/products/product-field-roast-creamy-original-chao-slices.jpg","imageAlt":"Field Roast Creamy Original Chao Slices product visual","imagePage":"https://fieldroast.com/product/creamy-original-chao-slices/","imageCredit":"Field Roast · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://fieldroast.com/product/creamy-original-chao-slices/","imageRightsBasis":"official-source-identification-thumbnail"},"product-follow-your-heart-smoked-provolone-style-slices":{"dataUrl":"imgs/products/product-follow-your-heart-smoked-provolone-style-slices.jpg","imageAlt":"Follow Your Heart Smoked Provolone Style Slices product visual","imagePage":"https://followyourheart.com/vegan-foods/dairy-free-cheese/","imageCredit":"Follow Your Heart · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://followyourheart.com/vegan-foods/dairy-free-cheese/","imageRightsBasis":"official-source-identification-thumbnail"},"product-follow-your-heart-parmesan-style-shreds":{"dataUrl":"imgs/products/product-follow-your-heart-parmesan-style-shreds.jpg","imageAlt":"Follow Your Heart Parmesan Style Shreds product visual","imagePage":"https://followyourheart.com/vegan-foods/dairy-free-cheese/","imageCredit":"Follow Your Heart · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://followyourheart.com/vegan-foods/dairy-free-cheese/","imageRightsBasis":"official-source-identification-thumbnail"},"product-kite-hill-plain-plant-based-cream-cheese":{"dataUrl":"imgs/products/product-kite-hill-plain-plant-based-cream-cheese.jpg","imageAlt":"Kite Hill Plain Plant-Based Cream Cheese product visual","imagePage":"https://kite-hill.com/products/plain-cream-cheese","imageCredit":"Kite Hill · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://kite-hill.com/products/plain-cream-cheese","imageRightsBasis":"official-source-identification-thumbnail"},"product-tofutti-plain-dairy-free-cream-cheese":{"dataUrl":"imgs/products/product-tofutti-plain-dairy-free-cream-cheese.jpg","imageAlt":"Tofutti Plain Dairy-Free Cream Cheese product visual","imagePage":"https://www.tofutti.com/better-than-cream-cheese-plain","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-earth-balance-original-buttery-spread":{"dataUrl":"imgs/products/product-earth-balance-original-buttery-spread.jpg","imageAlt":"Earth Balance Original Buttery Spread product visual","imagePage":"https://www.earthbalancenatural.com/products","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-country-crock-plant-butter-with-olive-oil":{"dataUrl":"imgs/products/product-country-crock-plant-butter-with-olive-oil.jpg","imageAlt":"Country Crock Plant Butter with Olive Oil product visual","imagePage":"https://www.countrycrock.com/en-us/our-products/plant-butter-cream/olive-sticks","imageCredit":"Country Crock · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.countrycrock.com/en-us/our-products/plant-butter-cream/olive-sticks","imageRightsBasis":"official-source-identification-thumbnail"},"product-miyoko-s-creamery-miyoko-s-european-style-plant-milk-butter":{"dataUrl":"imgs/products/product-miyoko-s-creamery-miyoko-s-european-style-plant-milk-butter.jpg","imageAlt":"Miyoko’s Creamery Miyoko’s European Style Plant Milk Butter product visual","imagePage":"https://www.miyokos.com/products/european-style-plant-milk-butter-salted","imageCredit":"Miyoko’s Creamery · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.miyokos.com/products/european-style-plant-milk-butter-salted","imageRightsBasis":"official-source-identification-thumbnail"},"product-follow-your-heart-vegenaise-original":{"dataUrl":"imgs/products/product-follow-your-heart-vegenaise-original.jpg","imageAlt":"Follow Your Heart Vegenaise Original product visual","imagePage":"https://followyourheart.com/vegan-foods/dairy-free-mayo/original-vegenaise/","imageCredit":"Follow Your Heart · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://followyourheart.com/vegan-foods/dairy-free-mayo/original-vegenaise/","imageRightsBasis":"official-source-identification-thumbnail"},"product-hellmann-s-vegan-dressing-and-spread":{"dataUrl":"imgs/products/product-hellmann-s-vegan-dressing-and-spread.jpg","imageAlt":"Hellmann’s Vegan Dressing & Spread product visual","imagePage":"https://www.hellmanns.com/us/en/p/plant-based-mayo-spread-%26-dressing.html/00048001016637","imageCredit":"Hellmann’s · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.hellmanns.com/us/en/p/plant-based-mayo-spread-%26-dressing.html/00048001016637","imageRightsBasis":"official-source-identification-thumbnail"},"product-just-egg-just-egg":{"dataUrl":"imgs/products/product-just-egg-just-egg.jpg","imageAlt":"JUST Egg JUST Egg product visual","imagePage":"https://ju.st/allergy-friendly","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-just-egg-just-egg-folded":{"dataUrl":"imgs/products/product-just-egg-just-egg-folded.jpg","imageAlt":"JUST Egg JUST Egg Folded product visual","imagePage":"https://ju.st/allergy-friendly","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-kite-hill-plain-almond-milk-yogurt":{"dataUrl":"imgs/products/product-kite-hill-plain-almond-milk-yogurt.jpg","imageAlt":"Kite Hill Plain Almond Milk Yogurt product visual","imagePage":"https://kite-hill.com/pages/faq","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-oatly-oatmilk-yogurt-alternative":{"dataUrl":"imgs/products/product-oatly-oatmilk-yogurt-alternative.jpg","imageAlt":"Oatly Oatmilk Yogurt Alternative product visual","imagePage":"https://www.oatly.com/en-us/products","imageCredit":"Oatly · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.oatly.com/en-us/products","imageRightsBasis":"official-source-identification-thumbnail"},"product-so-delicious-coconutmilk-yogurt-alternative":{"dataUrl":"imgs/products/product-so-delicious-coconutmilk-yogurt-alternative.jpg","imageAlt":"So Delicious Coconutmilk Yogurt Alternative product visual","imagePage":"https://sodeliciousdairyfree.com/about-us/faqs","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-silk-soymilk-yogurt-alternative":{"dataUrl":"imgs/products/product-silk-soymilk-yogurt-alternative.jpg","imagePage":"https://silk.com/plant-based-products/dairy-free-yogurt-alternatives/vanilla-protein-dairy-free-yogurt-alternative/","imageCredit":"Silk · official-source product image","imageAlt":"Silk Vanilla Protein Dairy-Free Yogurt product visual","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://silk.com/plant-based-products/dairy-free-yogurt-alternatives/vanilla-protein-dairy-free-yogurt-alternative/","imageRightsBasis":"official-source-identification-thumbnail"},"product-oatly-vanilla-frozen-dessert":{"dataUrl":"imgs/products/product-oatly-vanilla-frozen-dessert.jpg","imagePage":"https://www.oatly.com/en-us/products/frozen-dessert/frozen-dessert-vanilla-16-oz","imageCredit":"Oatly · official-source product image","imageAlt":"Oatly Vanilla Frozen Dessert product visual","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.oatly.com/en-us/products/frozen-dessert/frozen-dessert-vanilla-16-oz","imageRightsBasis":"official-source-identification-thumbnail"},"product-oatly-chocolate-frozen-dessert":{"dataUrl":"imgs/products/product-oatly-chocolate-frozen-dessert.jpg","imagePage":"https://www.oatly.com/en-us/products/frozen-dessert/frozen-dessert-chocolate-16-oz","imageCredit":"Oatly · official-source product image","imageAlt":"Oatly Chocolate Frozen Dessert product visual","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.oatly.com/en-us/products/frozen-dessert/frozen-dessert-chocolate-16-oz","imageRightsBasis":"official-source-identification-thumbnail"},"product-so-delicious-coconutmilk-frozen-dessert":{"dataUrl":"imgs/products/product-so-delicious-coconutmilk-frozen-dessert.jpg","imageAlt":"So Delicious Coconutmilk Frozen Dessert product visual","imagePage":"https://sodeliciousdairyfree.com/dairy-free-foods/dairy-free-frozen-desserts/coconutmilk/no-sugar-added-vanilla-bean","imageCredit":"So Delicious · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://sodeliciousdairyfree.com/dairy-free-foods/dairy-free-frozen-desserts/coconutmilk/no-sugar-added-vanilla-bean","imageRightsBasis":"official-source-identification-thumbnail"},"product-so-delicious-cashewmilk-frozen-dessert":{"dataUrl":"imgs/products/product-so-delicious-cashewmilk-frozen-dessert.jpg","imageAlt":"So Delicious Cashewmilk Frozen Dessert product visual","imagePage":"https://sodeliciousdairyfree.com/about-us/faqs","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-ben-and-jerry-s-non-dairy-frozen-dessert":{"dataUrl":"imgs/products/product-ben-and-jerry-s-non-dairy-frozen-dessert.jpg","imageAlt":"Ben & Jerry’s Non-Dairy Frozen Dessert product visual","imagePage":"https://www.benjerry.com/flavors/non-dairy","imageCredit":"Ben & Jerry’s · official-source product image","imageLicense":"Official promotional product image; rights retained by brand","imageLicenseUrl":"https://www.benjerry.com/flavors/non-dairy","imageRightsBasis":"official-source-identification-thumbnail"},"product-daiya-vegan-mac-and-cheeze":{"dataUrl":"imgs/products/product-daiya-vegan-mac-and-cheeze.jpg","imageAlt":"Daiya Vegan Mac & Cheeze product visual","imagePage":"https://daiyafoods.com/pages/faq","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-daiya-plant-based-pepperoni-pizza":{"dataUrl":"imgs/products/product-daiya-plant-based-pepperoni-pizza.jpg","imageAlt":"Daiya Plant-Based Pepperoni Pizza product visual","imagePage":"https://daiyafoods.com/pages/faq","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-amy-s-vegetable-pad-thai":{"dataUrl":"imgs/products/product-amy-s-vegetable-pad-thai.jpg","imageAlt":"Amy’s Vegetable Pad Thai product visual","imagePage":"https://www.amys.com/our-foods/pad-thai-family-size","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-blackbird-foods-vegan-margherita-pizza":{"dataUrl":"imgs/products/product-blackbird-foods-vegan-margherita-pizza.jpg","imageAlt":"Blackbird Foods Vegan Margherita Pizza product visual","imagePage":"https://www.blackbirdfoods.com/margherita-pizza","imageCredit":"Go Vegan original product catalog card","imageLicense":"Original Go Vegan project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-go-vegan-product-card","imageCardDisclosure":"Official package image unavailable; this is an original identification card, not package photography."},"product-homemade-black-bean-burger":{"dataUrl":"imgs/products/product-homemade-black-bean-burger.jpg","imageAlt":"Homemade Black Bean Burger product visual","imagePage":"https://commons.wikimedia.org/wiki/File:Vegetarian_black_bean_burger_with_homefries.jpg","imageCredit":"Go Vegan recipe visual · Bing from Boston, United States","imageLicense":"CC BY 2.0","imageLicenseUrl":"https://creativecommons.org/licenses/by/2.0","imageRightsBasis":"wikimedia-commons-reusable-license","imageRecipeSource":"recipe-black-bean-burger"},"product-homemade-lentil-burger":{"dataUrl":"imgs/products/product-homemade-lentil-burger.jpg","imageAlt":"Homemade Lentil Burger product visual","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageGenerationDisclosure":"AI-generated image created specifically for this homemade product card."},"product-homemade-walnut-lentil-taco-meat":{"dataUrl":"imgs/products/product-homemade-walnut-lentil-taco-meat.jpg","imageAlt":"Homemade Walnut Lentil Taco Meat product visual","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Go Vegan recipe visual · Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageRecipeSource":"recipe-walnut-lentil-taco-meat"},"product-homemade-mushroom-walnut-ground":{"dataUrl":"imgs/products/product-homemade-mushroom-walnut-ground.jpg","imageAlt":"Homemade Mushroom Walnut Ground product visual","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Go Vegan recipe visual · Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageRecipeSource":"recipe-mushroom-walnut-ground"},"product-homemade-tofu-scramble":{"dataUrl":"imgs/products/product-homemade-tofu-scramble.jpg","imageAlt":"Homemade Tofu Scramble product visual","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Go Vegan recipe visual · Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageRecipeSource":"recipe-tofu-scramble"},"product-homemade-chickpea-salad":{"dataUrl":"imgs/products/product-homemade-chickpea-salad.jpg","imageAlt":"Homemade Chickpea Salad product visual","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Go Vegan recipe visual · Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageRecipeSource":"recipe-chickpea-tuna-salad"},"product-homemade-carrot-lox":{"dataUrl":"imgs/products/product-homemade-carrot-lox.jpg","imageAlt":"Homemade Carrot Lox product visual","imagePage":"https://commons.wikimedia.org/wiki/File:Vegan_Sushinova_bagel.jpg","imageCredit":"Go Vegan recipe visual · Mx. Granger","imageLicense":"CC0","imageLicenseUrl":"http://creativecommons.org/publicdomain/zero/1.0/deed.en","imageRightsBasis":"wikimedia-commons-reusable-license","imageRecipeSource":"recipe-carrot-lox"},"product-homemade-cashew-cream-cheese":{"dataUrl":"imgs/products/product-homemade-cashew-cream-cheese.jpg","imageAlt":"Homemade Cashew Cream Cheese product visual","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageGenerationDisclosure":"AI-generated image created specifically for this homemade product card."},"product-homemade-sunflower-seed-cheese":{"dataUrl":"imgs/products/product-homemade-sunflower-seed-cheese.jpg","imageAlt":"Homemade Sunflower Seed Cheese product visual","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageGenerationDisclosure":"AI-generated image created specifically for this homemade product card."},"product-homemade-oat-milk":{"dataUrl":"imgs/products/product-homemade-oat-milk.jpg","imageAlt":"Homemade Oat Milk product visual","imagePage":"https://commons.wikimedia.org/wiki/File:Oat_milk_glass.jpg","imageCredit":"Go Vegan recipe visual · Shisma","imageLicense":"CC BY 4.0","imageLicenseUrl":"https://creativecommons.org/licenses/by/4.0","imageRightsBasis":"wikimedia-commons-reusable-license","imageRecipeSource":"recipe-homemade-oat-milk"},"product-homemade-flax-egg":{"dataUrl":"imgs/products/product-homemade-flax-egg.jpg","imageAlt":"Homemade Flax Egg product visual","imagePage":"https://commons.wikimedia.org/wiki/File:Ground_Flax_Meal_Egg_Replacer_(8612677580).jpg","imageCredit":"Go Vegan recipe visual · Veganbaking.net from USA","imageLicense":"CC BY-SA 2.0","imageLicenseUrl":"https://creativecommons.org/licenses/by-sa/2.0","imageRightsBasis":"wikimedia-commons-reusable-license","imageRecipeSource":"recipe-flax-egg"},"product-homemade-chia-egg":{"dataUrl":"imgs/products/product-homemade-chia-egg.jpg","imageAlt":"Homemade Chia Egg product visual","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageGenerationDisclosure":"AI-generated image created specifically for this homemade product card."},"product-homemade-aquafaba":{"dataUrl":"imgs/products/product-homemade-aquafaba.jpg","imageAlt":"Homemade Aquafaba product visual","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageGenerationDisclosure":"AI-generated image created specifically for this homemade product card."},"product-homemade-banana-nice-cream":{"dataUrl":"imgs/products/product-homemade-banana-nice-cream.jpg","imageAlt":"Homemade Banana Nice Cream product visual","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Go Vegan recipe visual · Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageRecipeSource":"recipe-banana-nice-cream"}};
  products.forEach(product => {
    const image = embeddedProductImages[product.id];
    if (!image) return;
    Object.assign(product, image, {
      imageUrl: image.dataUrl,
      fallbackImageUrl: image.dataUrl,
      imageStatus: 'exact',
      imageStorage: 'embedded'
    });
    delete product.dataUrl;
  });

  // Embedded, record-specific recipe photographs and original food imagery.
  const embeddedRecipeImages = {"recipe-tofu-scramble":{"dataUrl":"imgs/recipes/recipe-tofu-scramble.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Tofu Scramble prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-overnight-oats":{"dataUrl":"imgs/recipes/recipe-overnight-oats.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Overnight Oats prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-black-bean-burger":{"dataUrl":"imgs/recipes/recipe-black-bean-burger.jpg","imagePage":"https://commons.wikimedia.org/wiki/File:Vegetarian_black_bean_burger_with_homefries.jpg","imageCredit":"Bing from Boston, United States","imageLicense":"CC BY 2.0","imageLicenseUrl":"https://creativecommons.org/licenses/by/2.0","imageRightsBasis":"wikimedia-commons-reusable-license","imageAlt":"Black Bean Burger prepared dish"},"recipe-chickpea-curry":{"dataUrl":"imgs/recipes/recipe-chickpea-curry.jpg","imagePage":"https://commons.wikimedia.org/wiki/File:Chickpea_Curry_-_Kolkata_2011-03-05_1910.JPG","imageCredit":"Biswarup Ganguly","imageLicense":"CC BY 3.0","imageLicenseUrl":"https://creativecommons.org/licenses/by/3.0","imageRightsBasis":"wikimedia-commons-reusable-license","imageAlt":"Chickpea Curry prepared dish"},"recipe-vegan-pancakes":{"dataUrl":"imgs/recipes/recipe-vegan-pancakes.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Vegan Pancakes prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-chickpea-tuna-salad":{"dataUrl":"imgs/recipes/recipe-chickpea-tuna-salad.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Chickpea Tuna Salad prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-banana-nice-cream":{"dataUrl":"imgs/recipes/recipe-banana-nice-cream.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Banana Nice Cream prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-chickpea-flour-omelet":{"dataUrl":"imgs/recipes/recipe-chickpea-flour-omelet.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Chickpea Flour Omelet prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-vegan-breakfast-burrito":{"dataUrl":"imgs/recipes/recipe-vegan-breakfast-burrito.jpg","imagePage":"https://commons.wikimedia.org/wiki/File:Vegan_breakfast_burrito_at_Bell_Tower_Cafe.jpg","imageCredit":"Mx. Granger","imageLicense":"CC0","imageLicenseUrl":"http://creativecommons.org/publicdomain/zero/1.0/deed.en","imageRightsBasis":"wikimedia-commons-reusable-license","imageAlt":"Vegan Breakfast Burrito prepared dish"},"recipe-chia-breakfast-pudding":{"dataUrl":"imgs/recipes/recipe-chia-breakfast-pudding.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Chia Breakfast Pudding prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-banana-oatmeal":{"dataUrl":"imgs/recipes/recipe-banana-oatmeal.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Banana Oatmeal prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-plant-based-breakfast-sandwich":{"dataUrl":"imgs/recipes/recipe-plant-based-breakfast-sandwich.jpg","imagePage":"https://commons.wikimedia.org/wiki/File:The_Big_Breakfast_and_Three_Vegan_Sausages_Breakfast_Sandwich_by_Caf%C3%A9_Arium.jpg","imageCredit":"Andy Li","imageLicense":"CC0","imageLicenseUrl":"http://creativecommons.org/publicdomain/zero/1.0/deed.en","imageRightsBasis":"wikimedia-commons-reusable-license","imageAlt":"Plant-Based Breakfast Sandwich prepared dish"},"recipe-homemade-oat-milk":{"dataUrl":"imgs/recipes/recipe-homemade-oat-milk.jpg","imagePage":"https://commons.wikimedia.org/wiki/File:Oat_milk_glass.jpg","imageCredit":"Shisma","imageLicense":"CC BY 4.0","imageLicenseUrl":"https://creativecommons.org/licenses/by/4.0","imageRightsBasis":"wikimedia-commons-reusable-license","imageAlt":"Homemade Oat Milk prepared dish"},"recipe-cashew-cream":{"dataUrl":"imgs/recipes/recipe-cashew-cream.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Cashew Cream prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-sunflower-seed-cream":{"dataUrl":"imgs/recipes/recipe-sunflower-seed-cream.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Sunflower Seed Cream prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-tofu-ricotta":{"dataUrl":"imgs/recipes/recipe-tofu-ricotta.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Tofu Ricotta prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-quick-vegan-cheese-sauce":{"dataUrl":"imgs/recipes/recipe-quick-vegan-cheese-sauce.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Quick Vegan Cheese Sauce prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-aquafaba-mayonnaise":{"dataUrl":"imgs/recipes/recipe-aquafaba-mayonnaise.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Aquafaba Mayonnaise prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-flax-egg":{"dataUrl":"imgs/recipes/recipe-flax-egg.jpg","imagePage":"https://commons.wikimedia.org/wiki/File:Ground_Flax_Meal_Egg_Replacer_(8612677580).jpg","imageCredit":"Veganbaking.net from USA","imageLicense":"CC BY-SA 2.0","imageLicenseUrl":"https://creativecommons.org/licenses/by-sa/2.0","imageRightsBasis":"wikimedia-commons-reusable-license","imageAlt":"Flax Egg prepared dish"},"recipe-lentil-taco-filling":{"dataUrl":"imgs/recipes/recipe-lentil-taco-filling.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Lentil Taco Filling prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-walnut-lentil-taco-meat":{"dataUrl":"imgs/recipes/recipe-walnut-lentil-taco-meat.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Walnut Lentil Taco Meat prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-lentil-bolognese":{"dataUrl":"imgs/recipes/recipe-lentil-bolognese.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Lentil Bolognese prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-three-bean-chili":{"dataUrl":"imgs/recipes/recipe-three-bean-chili.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Three-Bean Chili prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-tofu-vegetable-stir-fry":{"dataUrl":"imgs/recipes/recipe-tofu-vegetable-stir-fry.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Tofu Vegetable Stir-Fry prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-sheet-pan-tofu-and-vegetables":{"dataUrl":"imgs/recipes/recipe-sheet-pan-tofu-and-vegetables.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Sheet-Pan Tofu and Vegetables prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-mushroom-walnut-ground":{"dataUrl":"imgs/recipes/recipe-mushroom-walnut-ground.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Mushroom Walnut Ground prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-red-beans-and-rice":{"dataUrl":"imgs/recipes/recipe-red-beans-and-rice.jpg","imagePage":"https://commons.wikimedia.org/wiki/File:Red_Beans_and_Rice.jpg","imageCredit":"Arnold Gatilao from Fremont, CA, USA","imageLicense":"CC BY 2.0","imageLicenseUrl":"https://creativecommons.org/licenses/by/2.0","imageRightsBasis":"wikimedia-commons-reusable-license","imageAlt":"Red Beans and Rice prepared dish"},"recipe-creamy-mushroom-stroganoff":{"dataUrl":"imgs/recipes/recipe-creamy-mushroom-stroganoff.jpg","imagePage":"https://commons.wikimedia.org/wiki/File:Baked_Mushroom_Stroganoff_Spud_with_Squash_(3612329429).jpg","imageCredit":"Vegan Feast Catering","imageLicense":"CC BY 2.0","imageLicenseUrl":"https://creativecommons.org/licenses/by/2.0","imageRightsBasis":"wikimedia-commons-reusable-license","imageAlt":"Creamy Mushroom Stroganoff prepared dish"},"recipe-vegan-mac-and-cheese":{"dataUrl":"imgs/recipes/recipe-vegan-mac-and-cheese.jpg","imagePage":"https://commons.wikimedia.org/wiki/File:Vegan_Macaroni_and_Cheese_(2945501757).jpg","imageCredit":"Kari Sullivan from Austin, TX","imageLicense":"CC BY 2.0","imageLicenseUrl":"https://creativecommons.org/licenses/by/2.0","imageRightsBasis":"wikimedia-commons-reusable-license","imageAlt":"Vegan Mac and Cheese prepared dish"},"recipe-chickpea-pot-pie":{"dataUrl":"imgs/recipes/recipe-chickpea-pot-pie.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Chickpea Pot Pie prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-quinoa-chickpea-meal-prep-bowls":{"dataUrl":"imgs/recipes/recipe-quinoa-chickpea-meal-prep-bowls.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Quinoa Chickpea Meal-Prep Bowls prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-hummus-vegetable-wrap":{"dataUrl":"imgs/recipes/recipe-hummus-vegetable-wrap.jpg","imagePage":"https://commons.wikimedia.org/wiki/File:Vegetable_and_Basil-Garlic_Hummus_Wrap_(4800115998).jpg","imageCredit":"Jennifer from Vancouver, Canada","imageLicense":"CC BY 2.0","imageLicenseUrl":"https://creativecommons.org/licenses/by/2.0","imageRightsBasis":"wikimedia-commons-reusable-license","imageAlt":"Hummus Vegetable Wrap prepared dish"},"recipe-white-bean-sandwich-spread":{"dataUrl":"imgs/recipes/recipe-white-bean-sandwich-spread.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"White Bean Sandwich Spread prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-lentil-vegetable-soup":{"dataUrl":"imgs/recipes/recipe-lentil-vegetable-soup.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Lentil Vegetable Soup prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-banana-blossom-fish-style-fillets":{"dataUrl":"imgs/recipes/recipe-banana-blossom-fish-style-fillets.jpg","imagePage":"https://commons.wikimedia.org/wiki/File:Vegan_fish_and_chips_with_mushy_peas.jpg","imageCredit":"Mx. Granger","imageLicense":"CC0","imageLicenseUrl":"http://creativecommons.org/publicdomain/zero/1.0/deed.en","imageRightsBasis":"wikimedia-commons-reusable-license","imageAlt":"Banana Blossom Fish-Style Fillets prepared dish"},"recipe-hearts-of-palm-crabless-cakes":{"dataUrl":"imgs/recipes/recipe-hearts-of-palm-crabless-cakes.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Hearts of Palm Crabless Cakes prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-carrot-lox":{"dataUrl":"imgs/recipes/recipe-carrot-lox.jpg","imagePage":"https://commons.wikimedia.org/wiki/File:Vegan_Sushinova_bagel.jpg","imageCredit":"Mx. Granger","imageLicense":"CC0","imageLicenseUrl":"http://creativecommons.org/publicdomain/zero/1.0/deed.en","imageRightsBasis":"wikimedia-commons-reusable-license","imageAlt":"Carrot Lox prepared dish"},"recipe-chickpea-tuna-style-melt":{"dataUrl":"imgs/recipes/recipe-chickpea-tuna-style-melt.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Chickpea Tuna-Style Melt prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-silken-tofu-chocolate-pudding":{"dataUrl":"imgs/recipes/recipe-silken-tofu-chocolate-pudding.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Silken Tofu Chocolate Pudding prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-apple-oat-crumble":{"dataUrl":"imgs/recipes/recipe-apple-oat-crumble.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Apple Oat Crumble prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-vegan-chocolate-chip-cookies":{"dataUrl":"imgs/recipes/recipe-vegan-chocolate-chip-cookies.jpg","imagePage":"https://commons.wikimedia.org/wiki/File:Tollhouse_Style_Vegan_Chocolate_Chip_Cookies.jpg","imageCredit":"Kari Sullivan","imageLicense":"CC BY 2.0","imageLicenseUrl":"https://creativecommons.org/licenses/by/2.0","imageRightsBasis":"wikimedia-commons-reusable-license","imageAlt":"Vegan Chocolate Chip Cookies prepared dish"},"recipe-fudgy-black-bean-brownies":{"dataUrl":"imgs/recipes/recipe-fudgy-black-bean-brownies.jpg","imagePage":"https://commons.wikimedia.org/wiki/File:Black_bean_Brownies_(34470711140).jpg","imageCredit":"A Healthier Michigan from Detroit, United States","imageLicense":"CC BY-SA 2.0","imageLicenseUrl":"https://creativecommons.org/licenses/by-sa/2.0","imageRightsBasis":"wikimedia-commons-reusable-license","imageAlt":"Fudgy Black Bean Brownies prepared dish"},"recipe-coconut-rice-pudding":{"dataUrl":"imgs/recipes/recipe-coconut-rice-pudding.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Coconut Rice Pudding prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-strawberry-nice-cream":{"dataUrl":"imgs/recipes/recipe-strawberry-nice-cream.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Strawberry Nice Cream prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."},"recipe-maple-mustard-dressing":{"dataUrl":"imgs/recipes/recipe-maple-mustard-dressing.jpg","imagePage":"https://openai.com/policies/terms-of-use/","imageCredit":"Original food image generated for the Go Vegan project","imageLicense":"Original project artwork","imageLicenseUrl":"https://openai.com/policies/terms-of-use/","imageRightsBasis":"original-ai-generated-for-go-vegan","imageAlt":"Maple Mustard Dressing prepared dish","imageGenerationDisclosure":"AI-generated food image created specifically for this recipe card."}};
  recipes.forEach(recipe => {
    const image = embeddedRecipeImages[recipe.id];
    if (!image) return;
    Object.assign(recipe, image, {
      imageUrl: image.dataUrl,
      fallbackImageUrl: image.dataUrl,
      imageStatus: 'exact',
      imageStorage: 'embedded'
    });
    delete recipe.dataUrl;
  });

  // Embedded, record-specific animal photographs with reusable Commons licenses.
  const embeddedAnimalImages = {"animal-cattle":{"dataUrl":"imgs/animals/animal-cattle.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:A_domestic_cow_(Bos_taurus)_in_a_field,_near_Denbigh_and_Flintshire.jpg","imageCredit":"Seraaron","imageLicense":"CC BY-SA 4.0","imageLicenseUrl":"https://creativecommons.org/licenses/by-sa/4.0","imageAlt":"Cow standing in a green pasture","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-pig":{"dataUrl":"imgs/animals/animal-pig.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:Pot-bellied_pigs_in_Lisbon_Zoo_2008.jpg","imageCredit":"Alvesgaspar","imageLicense":"CC BY-SA 4.0","imageLicenseUrl":"https://creativecommons.org/licenses/by-sa/4.0","imageAlt":"Two domestic pigs resting on straw","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-chicken":{"dataUrl":"imgs/animals/animal-chicken.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:Chicken_February_2009-1.jpg","imageCredit":"Alvesgaspar","imageLicense":"CC BY-SA 3.0","imageLicenseUrl":"https://creativecommons.org/licenses/by-sa/3.0","imageAlt":"Domestic chicken walking outdoors","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-turkey":{"dataUrl":"imgs/animals/animal-turkey.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:Male_north_american_turkey_supersaturated.jpg","imageCredit":"photo taken by Lupin on en:Wikipedia","imageLicense":"CC BY-SA 3.0","imageLicenseUrl":"http://creativecommons.org/licenses/by-sa/3.0/","imageAlt":"Adult turkey standing outdoors","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-duck-goose":{"dataUrl":"imgs/animals/animal-duck-goose.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:Toulouse_Goose_and_Duck.jpg","imageCredit":"Jim Linwood","imageLicense":"CC BY 2.0","imageLicenseUrl":"https://creativecommons.org/licenses/by/2.0","imageAlt":"A domestic goose and duck together","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-sheep":{"dataUrl":"imgs/animals/animal-sheep.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:Flock_of_sheep.jpg","imageCredit":"Keith Weller","imageLicense":"Public domain","imageLicenseUrl":"https://creativecommons.org/publicdomain/mark/1.0/","imageAlt":"Flock of domestic sheep","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-goat":{"dataUrl":"imgs/animals/animal-goat.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:Gorge_du_Verdon_Goat_0254.jpg","imageCredit":"Dirk Beyer","imageLicense":"CC BY-SA 3.0","imageLicenseUrl":"http://creativecommons.org/licenses/by-sa/3.0/","imageAlt":"Domestic goat standing outdoors","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-rabbit":{"dataUrl":"imgs/animals/animal-rabbit.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:Oryctolagus_cuniculus_Tasmania_2.jpg","imageCredit":"JJ Harrison (https://www.jjharrison.com.au/)","imageLicense":"CC BY-SA 3.0","imageLicenseUrl":"https://creativecommons.org/licenses/by-sa/3.0","imageAlt":"Rabbit sitting in grass","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-fish":{"dataUrl":"imgs/animals/animal-fish.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:School_of_fish_seen_from_Underwater_Tunnel_Atlantis.jpg","imageCredit":"Fred Hsu (Wikipedia:User:Fredhsu on en.wikipedia)","imageLicense":"CC BY-SA 3.0","imageLicenseUrl":"http://creativecommons.org/licenses/by-sa/3.0/","imageAlt":"School of finfish swimming underwater","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-shellfish":{"dataUrl":"imgs/animals/animal-shellfish.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:American_Lobster,_Gloucester,_Massachusetts_(6806968853).jpg","imageCredit":"USEPA Environmental-Protection-Agency","imageLicense":"Public domain","imageLicenseUrl":"https://creativecommons.org/publicdomain/mark/1.0/","imageAlt":"American lobster underwater","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-bees":{"dataUrl":"imgs/animals/animal-bees.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:European_honey_bee_extracts_nectar.jpg","imageCredit":"John Severns (Severnjc)","imageLicense":"Public domain","imageLicenseUrl":"https://creativecommons.org/publicdomain/mark/1.0/","imageAlt":"Honey bee collecting nectar from a flower","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-silkworm":{"dataUrl":"imgs/animals/animal-silkworm.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:Silkworms3000px.jpg","imageCredit":"Fastily (talk)","imageLicense":"CC BY-SA 3.0","imageLicenseUrl":"https://creativecommons.org/licenses/by-sa/3.0","imageAlt":"Silkworm larvae on leaves","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-cochineal":{"dataUrl":"imgs/animals/animal-cochineal.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:Dactylopius_coccus_(Barlovento)_01_ies.jpg","imageCredit":"Frank Vincentz","imageLicense":"CC BY-SA 3.0","imageLicenseUrl":"http://creativecommons.org/licenses/by-sa/3.0/","imageAlt":"Cochineal insects on a cactus pad","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-laboratory":{"dataUrl":"imgs/animals/animal-laboratory.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:Lab_animal_care.jpg","imageCredit":"usda","imageLicense":"Public domain","imageLicenseUrl":"https://creativecommons.org/publicdomain/mark/1.0/","imageAlt":"Animal-care worker recording observations beside rabbits","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-dog":{"dataUrl":"imgs/animals/animal-dog.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:Golden-retriever-dog-1362597631o6g.jpg","imageCredit":"Karen Arnold","imageLicense":"CC0","imageLicenseUrl":"http://creativecommons.org/publicdomain/zero/1.0/deed.en","imageAlt":"Golden retriever outdoors","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-cat":{"dataUrl":"imgs/animals/animal-cat.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:Felis_catus-cat_on_snow.jpg","imageCredit":"Von.grzanka","imageLicense":"CC BY-SA 3.0","imageLicenseUrl":"https://creativecommons.org/licenses/by-sa/3.0","imageAlt":"Domestic cat standing in snow","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-mink":{"dataUrl":"imgs/animals/animal-mink.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:Norka_ameryka%C5%84ska_(neovison_vison).jpg","imageCredit":"Wojciech Uszak","imageLicense":"CC BY-SA 4.0","imageLicenseUrl":"https://creativecommons.org/licenses/by-sa/4.0","imageAlt":"American mink near water","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-fox":{"dataUrl":"imgs/animals/animal-fox.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:R%C3%B8d_r%C3%A6v_(Vulpes_vulpes).jpg","imageCredit":"Malene Thyssen","imageLicense":"CC BY 2.5","imageLicenseUrl":"https://creativecommons.org/licenses/by/2.5","imageAlt":"Red fox sitting in grass","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-raccoon-dog":{"dataUrl":"imgs/animals/animal-raccoon-dog.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:Nyctereutes_procyonoides_1.jpg","imageCredit":"Rigelus","imageLicense":"CC BY-SA 4.0","imageLicenseUrl":"https://creativecommons.org/licenses/by-sa/4.0","imageAlt":"Living raccoon dog outdoors","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-chinchilla":{"dataUrl":"imgs/animals/animal-chinchilla.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:Chinchilla-Patchouli.jpg","imageCredit":"Salix","imageLicense":"CC BY-SA 3.0","imageLicenseUrl":"http://creativecommons.org/licenses/by-sa/3.0/","imageAlt":"Chinchilla portrait","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-horse-donkey":{"dataUrl":"imgs/animals/animal-horse-donkey.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:Horse_and_Donkey_-_geograph.org.uk_-_574211.jpg","imageCredit":"Stephen McKay","imageLicense":"CC BY-SA 2.0","imageLicenseUrl":"https://creativecommons.org/licenses/by-sa/2.0","imageAlt":"Horse and donkey together","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-research-rodents":{"dataUrl":"imgs/animals/animal-research-rodents.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:Black-mouse-trio-in-cage-2.jpg","imageCredit":"Commissioned by Understanding Animal Research","imageLicense":"CC BY-SA 4.0","imageLicenseUrl":"https://creativecommons.org/licenses/by-sa/4.0","imageAlt":"Laboratory mice in a habitat enclosure","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-nonhuman-primate":{"dataUrl":"imgs/animals/animal-nonhuman-primate.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:Macaca_nigra_self-portrait_full_body.jpg","imageCredit":"Self-portrait by the depicted Macaca nigra female","imageLicense":"Public domain","imageLicenseUrl":"https://creativecommons.org/publicdomain/mark/1.0/","imageAlt":"Celebes crested macaque portrait","imageRightsBasis":"wikimedia-commons-reusable-license"},"animal-coyote":{"dataUrl":"imgs/animals/animal-coyote.jpg","image":null,"imagePage":"https://commons.wikimedia.org/wiki/File:Coyote_portrait.jpg","imageCredit":"Christopher Bruno","imageLicense":"CC BY-SA 3.0","imageLicenseUrl":"http://creativecommons.org/licenses/by-sa/3.0/","imageAlt":"Coyote portrait","imageRightsBasis":"wikimedia-commons-reusable-license"}};
  animals.forEach(animal => {
    const image = embeddedAnimalImages[animal.id];
    if (!image) return;
    Object.assign(animal, image, {
      imageUrl: image.dataUrl,
      fallbackImageUrl: image.dataUrl,
      imageStatus: 'exact',
      imageStorage: 'embedded',
      imageRightsBasis: 'wikimedia-commons-reusable-license'
    });
    delete animal.dataUrl;
  });

  // ---- Contextual Learn articles ----
  if (!learnArticles.some(article => article.id === 'learn-ethics-compassion')) learnArticles.push({
    id: 'learn-ethics-compassion',
    title: 'Ethics, compassion and animal interests',
    category: 'Ethics',
    content: '<p>Ethical veganism asks whether an animal’s capacity to feel pain, pleasure, fear and attachment should matter when humans choose food, clothing, entertainment and other products.</p><p>You do not need to consume graphic media to take animal interests seriously. Choose resources that match your emotional capacity, and focus on practical changes that reduce participation in exploitation.</p>',
    sourceIds: ['source-vegan-society'],
    needsResearch: false
  });
  if (!learnArticles.some(article => article.id === 'learn-environment')) learnArticles.push({
    id: 'learn-environment',
    title: 'Food choices and environmental impact',
    category: 'Environment',
    content: '<p>Food production affects greenhouse-gas emissions, land use, freshwater use, biodiversity and water pollution. The size of each impact varies by food and production system, so compare evidence rather than relying on a single statistic.</p><p>Plant-rich choices can reduce several pressures, but environmental responsibility also includes food access, waste, labor, farming practices and broader policy.</p>',
    sourceIds: [],
    needsResearch: false
  });

  // ---- Phase 3B: contextual resource relationships ----
  const resourceById = id => resources.find(resource => resource.id === id);
  const setResourceRelations = (id, relations) => {
    const resource = resourceById(id);
    if (resource) Object.assign(resource, relations);
  };
  const animalIdsWithUses = animals.filter(animal => (animal.useIds || []).length > 0 || (animal.industries || []).length > 0).map(animal => animal.id);
  const farmedAnimalIds = animals.filter(animal => (animal.categories || []).some(category => /farmed|agriculture|food/i.test(category)) || (animal.industries || []).some(industry => /meat|dairy|egg|wool|leather|food|agriculture/i.test(industry))).map(animal => animal.id);

  setResourceRelations('resource-dominion', {
    relatedAnimalIds: animalIdsWithUses,
    relatedArticleIds: ['learn-why-vegan', 'learn-ethics-compassion'],
    relatedProductCategories: ['Ground Meat', 'Burger', 'Meatballs', 'Steak', 'Chicken', 'Deli Meat', 'Sausage', 'Hot Dogs', 'Bacon', 'Breakfast Meat', 'Seafood', 'Milk', 'Cheese', 'Eggs'],
    journeyPathIds: ['thirty-day']
  });
  setResourceRelations('resource-earthlings', { relatedAnimalIds: animalIdsWithUses, relatedArticleIds: ['learn-why-vegan'], relatedProductCategories: [], journeyPathIds: [] });
  setResourceRelations('resource-farm-sanctuary', { relatedAnimalIds: farmedAnimalIds, relatedArticleIds: ['learn-why-vegan', 'learn-ethics-compassion'], relatedProductCategories: [], journeyPathIds: ['thirty-day'] });
  setResourceRelations('resource-animal-ethics', { relatedAnimalIds: animalIdsWithUses, relatedArticleIds: ['learn-why-vegan', 'learn-ethics-compassion'], relatedProductCategories: [], journeyPathIds: [] });
  setResourceRelations('resource-cowspiracy', { relatedAnimalIds: farmedAnimalIds, relatedArticleIds: ['learn-environment'], relatedProductCategories: ['Ground Meat', 'Burger', 'Steak', 'Milk', 'Cheese'], journeyPathIds: [] });
  setResourceRelations('resource-owid-food-impact', { relatedAnimalIds: farmedAnimalIds, relatedArticleIds: ['learn-environment'], relatedProductCategories: ['Ground Meat', 'Burger', 'Steak', 'Milk', 'Cheese'], journeyPathIds: ['whole-food'] });
  setResourceRelations('resource-food-footprints', { relatedAnimalIds: [], relatedArticleIds: ['learn-environment'], relatedProductCategories: ['Ground Meat', 'Burger', 'Steak', 'Milk', 'Cheese', 'Whole-Food'], journeyPathIds: ['whole-food'] });
  setResourceRelations('resource-vegan-society-guide', { relatedAnimalIds: [], relatedArticleIds: ['learn-getting-started', 'learn-first-grocery-trip', 'learn-label-reading'], relatedProductCategories: ['All Products'], journeyPathIds: ['one-swap', 'seven-day', 'thirty-day'] });
  setResourceRelations('resource-pcrm-starter-kit', { relatedAnimalIds: [], relatedArticleIds: ['learn-getting-started', 'learn-balanced-meals', 'learn-nutrition-basics'], relatedProductCategories: ['Whole-Food'], journeyPathIds: ['seven-day', 'thirty-day', 'whole-food'] });
  setResourceRelations('resource-vegan-starter-book', { relatedAnimalIds: [], relatedArticleIds: ['learn-getting-started', 'learn-balanced-meals'], relatedProductCategories: [], journeyPathIds: ['thirty-day'] });
  setResourceRelations('resource-nih-b12', { relatedAnimalIds: [], relatedArticleIds: ['learn-nutrition-basics', 'learn-b12-plan'], relatedNutrientIds: ['nutrient-b12'], relatedProductCategories: [], journeyPathIds: ['seven-day', 'thirty-day', 'whole-food'] });
  setResourceRelations('resource-vegan-society-nutrition', { relatedAnimalIds: [], relatedArticleIds: ['learn-balanced-meals', 'learn-nutrition-basics', 'learn-b12-plan'], relatedNutrientIds: ['nutrient-b12', 'nutrient-protein', 'nutrient-iron', 'nutrient-calcium', 'nutrient-vitamin-d', 'nutrient-iodine', 'nutrient-omega3', 'nutrient-zinc', 'nutrient-selenium', 'nutrient-choline'], relatedProductCategories: ['Whole-Food'], journeyPathIds: ['seven-day', 'thirty-day', 'whole-food'] });
  setResourceRelations('resource-why-we-love-dogs', { relatedAnimalIds: farmedAnimalIds, relatedArticleIds: ['learn-why-vegan', 'learn-ethics-compassion'], relatedProductCategories: [], journeyPathIds: [] });
  setResourceRelations('resource-ted-melanie-joy', { relatedAnimalIds: farmedAnimalIds, relatedArticleIds: ['learn-why-vegan', 'learn-ethics-compassion'], relatedProductCategories: [], journeyPathIds: ['thirty-day'] });

  // ---- Phase 3: alternative/product/recipe relationships ----
  const alternativeProductRules = {
    'alt-plant-milk': p => ['Milk'].includes(p.category),
    'alt-oat-milk': p => /oat/i.test(p.name + ' ' + p.base),
    'alt-soy-milk': p => /soy/i.test(p.name + ' ' + p.base) && p.category === 'Milk',
    'alt-plant-creamer': p => p.category === 'Creamer',
    'alt-plant-cheese': p => ['Cheese','Cream Cheese'].includes(p.category) || /cheese/i.test(p.replaces),
    'alt-plant-butter': p => p.category === 'Butter',
    'alt-plant-yogurt': p => p.category === 'Yogurt',
    'alt-plant-frozen-dessert': p => p.category === 'Ice Cream' || p.id === 'product-homemade-banana-nice-cream',
    'alt-vegan-mayo': p => p.category === 'Mayonnaise',
    'alt-commercial-egg': p => p.category === 'Eggs',
    'alt-commercial-plant-meat': p => ['Ground Meat','Burger','Meatballs','Steak','Chicken','Deli Meat','Sausage','Hot Dogs','Bacon','Breakfast Meat','Seafood'].includes(p.category) && p.brand !== 'Homemade',
    'alt-legume-meat': p => ['product-homemade-black-bean-burger','product-homemade-lentil-burger','product-homemade-walnut-lentil-taco-meat','product-homemade-mushroom-walnut-ground'].includes(p.id),
    'alt-seitan-tempeh': p => p.id === 'product-lightlife-smoky-tempeh-strips' || p.id === 'product-homemade-tofu-scramble',
    'alt-egg-cooking': p => p.id === 'product-homemade-tofu-scramble',
    'alt-egg-baking': p => ['product-homemade-flax-egg','product-homemade-chia-egg','product-homemade-aquafaba'].includes(p.id),
    'alt-plant-seafood': p => p.category === 'Seafood' || ['product-homemade-chickpea-salad','product-homemade-carrot-lox'].includes(p.id),
    'alt-vegan-prepared-meals': p => ['Prepared Meal','Pizza'].includes(p.category)
  };

  const alternativeRecipeMap = {
    'alt-plant-milk':['recipe-overnight-oats','recipe-vegan-pancakes'],
    'alt-legume-meat':['recipe-black-bean-burger','recipe-chickpea-curry'],
    'alt-seitan-tempeh':['recipe-tofu-scramble'],
    'alt-egg-cooking':['recipe-tofu-scramble'],
    'alt-egg-baking':['recipe-vegan-pancakes'],
    'alt-plant-seafood':['recipe-chickpea-tuna-salad'],
    'alt-plant-frozen-dessert':['recipe-banana-nice-cream']
  };

  const addUnique = (arr, value) => { if (!arr.includes(value)) arr.push(value); };
  alternatives.forEach(alt => {
    alt.relatedProductIds = Array.isArray(alt.relatedProductIds) ? alt.relatedProductIds : [];
    alt.relatedRecipeIds = Array.isArray(alt.relatedRecipeIds) ? alt.relatedRecipeIds : [];
    const rule = alternativeProductRules[alt.id];
    if (rule) products.filter(rule).forEach(p => addUnique(alt.relatedProductIds, p.id));
    (alternativeRecipeMap[alt.id] || []).forEach(id => addUnique(alt.relatedRecipeIds, id));
  });

  products.forEach(product => {
    product.alternativeIds = Array.isArray(product.alternativeIds) ? product.alternativeIds : [];
    alternatives.forEach(alt => {
      if (alt.relatedProductIds.includes(product.id)) addUnique(product.alternativeIds, alt.id);
    });
  });

  recipes.forEach(recipe => {
    recipe.alternativeIds = Array.isArray(recipe.alternativeIds) ? recipe.alternativeIds : [];
    recipe.alternativeIds.forEach(altId => { const alt = alternatives.find(a => a.id === altId); if (alt) addUnique(alt.relatedRecipeIds, recipe.id); });
    alternatives.forEach(alt => {
      if (alt.relatedRecipeIds.includes(recipe.id)) addUnique(recipe.alternativeIds, alt.id);
    });
  });


  // ---- Expose to global ----
  window.GoVeganData = {
    animals: animals,
    animalUses: animalUses,
    products: products,
    recipes: recipes,
    ingredients: ingredients,
    alternatives: alternatives,
    everydayItems: everydayItems,
    householdLocations: householdLocations,
    nutrients: nutrients,
    learnArticles: learnArticles,
    resources: resources,
    sources: sources,
    transitionPaths: transitionPaths,
    transitionTasksByPath: transitionTasksByPath
  };

  window.validateGoVeganData = validateGoVeganData;
})();

