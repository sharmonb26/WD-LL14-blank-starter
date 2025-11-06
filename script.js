// --- API ENDPOINTS ---
const BASE_URL = "https://www.themealdb.com/api/json/v1/1/";
const CATEGORIES_LIST_URL = BASE_URL + "list.php?c=list"; // New List API
const AREA_LIST_URL = BASE_URL + "list.php?a=list"; // New List API
const AREA_FILTER_BASE = BASE_URL + "filter.php?a=";
const CATEGORY_FILTER_BASE = BASE_URL + "filter.php?c=";
const DETAILS_LOOKUP_BASE = BASE_URL + "lookup.php?i=";
const RANDOM_DISH_URL = BASE_URL + "random.php";
const SEARCH_URL = BASE_URL + "search.php?s=";

// Fetch options with CORS headers
const fetchOptions = {
  method: "GET",
  headers: {
    Accept: "application/json",
  },
};

// --- DOM ELEMENT SELECTIONS ---
function verifyElement(element, name) {
  if (!element) {
    console.error(`Could not find ${name} element`);
  }
  return element;
}

const recipeGrid = verifyElement(
  document.querySelector(".recipe-grid"),
  "recipe grid"
);
const categorySelect = verifyElement(
  document.getElementById("category-select"),
  "category select"
);
const areaList = verifyElement(
  document.getElementById("area-list"),
  "area list"
);
const searchInput = verifyElement(
  document.getElementById("search-input"),
  "search input"
);
const searchButton = verifyElement(
  document.getElementById("search-button"),
  "search button"
);
const randomDishBtn = verifyElement(
  document.getElementById("random-dish-btn"),
  "random dish button"
);
const spinWheelBtn = verifyElement(
  document.getElementById("spin-wheel-btn"),
  "spin wheel button"
);
const flagSpinner = verifyElement(
  document.getElementById("flag-spinner"),
  "flag spinner"
);
const recipeDetailView = verifyElement(
  document.getElementById("recipe-detail-view"),
  "recipe detail view"
);
const holidaySelect = verifyElement(
  document.getElementById("holiday-select"),
  "holiday select"
);
const detailContent = verifyElement(
  document.getElementById("detail-content"),
  "detail content"
);
const backToGridBtn = verifyElement(
  document.getElementById("back-to-grid-btn"),
  "back to grid button"
);
const contentArea = verifyElement(
  document.querySelector(".content-area"),
  "content area"
);

// Handle browser back/forward buttons
window.onpopstate = function (event) {
  if (event.state) {
    if (event.state.view === "grid") {
      showGridView();
    } else if (event.state.view === "detail" && event.state.recipeId) {
      fetchRecipeDetails(event.state.recipeId, false);
    } else if (event.state.view === "mystery") {
      showMysteryView();
    }
  } else {
    // Default to grid view if no state
    showGridView();
  }
};

// Global cache for recipe list data
let currentRecipes = [];
let activeArea = "HOME"; // Default area
let homePageRecipes = []; // Cache for home page recipes

// Saved Recipes Functions
function getSavedRecipes() {
  try {
    const saved = localStorage.getItem("savedRecipes");
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Error reading saved recipes:", error);
    return [];
  }
}

function isRecipeSaved(recipeId) {
  const savedRecipes = getSavedRecipes();
  return savedRecipes.some((recipe) => recipe.id === recipeId);
}

function updateSavedRecipesList() {
  const savedRecipesList = document.getElementById("saved-recipes-list");
  const savedRecipes = getSavedRecipes();

  if (savedRecipes.length === 0) {
    savedRecipesList.innerHTML =
      '<li><em style="color: #aaaaaa;">No saved recipes yet</em></li>';
    return;
  }

  savedRecipesList.innerHTML = "";
  savedRecipes.forEach((recipe) => {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    li.style.gap = "8px";

    // Create link for recipe
    const link = document.createElement("a");
    link.href = "#";
    link.textContent = recipe.name;
    link.style.flex = "1";
    link.onclick = (e) => {
      e.preventDefault();
      fetchRecipeDetails(recipe.id);
    };

    // Create delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "✕";
    deleteBtn.style.border = "none";
    deleteBtn.style.background = "none";
    deleteBtn.style.color = "#E53935";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.style.fontSize = "16px";
    deleteBtn.style.padding = "4px 8px";
    deleteBtn.title = "Remove from saved recipes";
    deleteBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSaveRecipe(recipe.id, recipe.name);
      updateSavedRecipesList();
      // Also update heart button in detail view if this recipe is currently shown
      const saveButton = document.querySelector(".save-recipe-btn");
      if (saveButton && saveButton.dataset.id === recipe.id) {
        saveButton.textContent = "🤍";
        saveButton.classList.remove("saved");
      }
    };

    li.appendChild(link);
    li.appendChild(deleteBtn);
    savedRecipesList.appendChild(li);
  });
}

// --- LOCAL STORAGE FUNCTIONS ---
function getSavedRecipeIds() {
  try {
    const saved = localStorage.getItem("savedRecipes");
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error("Error reading saved recipes:", e);
    return [];
  }
}

function isRecipeSaved(idMeal) {
  const savedIds = getSavedRecipeIds();
  return savedIds.includes(String(idMeal));
}

function toggleSaveRecipe(idMeal, mealName) {
  let savedRecipes = getSavedRecipes();
  const recipeIndex = savedRecipes.findIndex((recipe) => recipe.id === idMeal);

  if (recipeIndex !== -1) {
    // Recipe exists, remove it
    savedRecipes.splice(recipeIndex, 1);
    console.log("Removed recipe:", mealName);
  } else {
    // Recipe doesn't exist, add it
    savedRecipes.push({
      id: idMeal,
      name: mealName,
    });
    console.log("Saved recipe:", mealName);
  }

  localStorage.setItem("savedRecipes", JSON.stringify(savedRecipes));
}

// --- DYNAMIC FILTER POPULATION ---

// Fetch and render Categories (from list.php?c=list)
async function fetchAndRenderCategories() {
  console.log("Fetching categories...");
  try {
    const response = await fetch(CATEGORIES_LIST_URL);
    const data = await response.json();

    if (data.meals) {
      data.meals.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat.strCategory;
        option.textContent = cat.strCategory;
        categorySelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error fetching categories:", error);
  }
}

// Initialize holiday select options
async function initializeHolidaySelect() {
  console.log("Initializing holiday select...");
  const holidays = ["Christmas", "Thanksgiving", "Eid", "Easter", "Diwali"];

  // Clear existing options
  holidaySelect.innerHTML = '<option value="">Select a Holiday</option>';

  console.log("Adding holiday options...");
  holidays.forEach((holiday) => {
    const option = document.createElement("option");
    option.value = holiday;
    option.textContent = holiday;
    holidaySelect.appendChild(option);
  });
}

// Fetch recipes for a specific holiday
async function fetchRecipesByHoliday(holiday) {
  recipeGrid.innerHTML = `<p style="text-align:center; color:#E53935; padding: 50px;">Loading ${holiday} Recipes...</p>`;

  try {
    let holidayRecipes = [];

    if (holiday.toLowerCase() === "diwali") {
      // For Diwali, fetch all Indian recipes
      const response = await fetch(AREA_FILTER_BASE + "Indian");
      const data = await response.json();
      if (data.meals) {
        // Get full details for each recipe
        for (const recipe of data.meals) {
          const detailResponse = await fetch(
            DETAILS_LOOKUP_BASE + recipe.idMeal
          );
          const detailData = await detailResponse.json();
          if (detailData.meals && detailData.meals[0]) {
            holidayRecipes.push(detailData.meals[0]);
          }
        }
      }
    } else if (holiday.toLowerCase() === "eid") {
      // For Eid, fetch recipes from Middle Eastern countries, Greece, and Kenya
      const middleEasternAreas = [
        "Egyptian",
        "Lebanese",
        "Turkish",
        "Greek",
        "Moroccan",
        "Saudi Arabian",
        "Kenyan",
        "Tunisian",
      ];

      for (const area of middleEasternAreas) {
        const areaResponse = await fetch(AREA_FILTER_BASE + area);
        const areaData = await areaResponse.json();
        if (areaData.meals) {
          // For each recipe, fetch full details to check ingredients and tags
          for (const recipe of areaData.meals) {
            const detailResponse = await fetch(
              DETAILS_LOOKUP_BASE + recipe.idMeal
            );
            const detailData = await detailResponse.json();
            if (detailData.meals && detailData.meals[0]) {
              holidayRecipes.push(detailData.meals[0]);
            }
          }
        }
      }
    } else if (holiday.toLowerCase() === "easter") {
      console.log("Fetching Easter recipes...");
      // Easter recipes search terms focusing on roasts
      const searchTerms = [
        "roast",
        "roast beef",
        "roast lamb",
        "roast ham",
        "glazed ham",
        "leg of lamb",
        "potato salad",
        "pudding",
        "roast vegetables",
      ];

      for (const term of searchTerms) {
        const response = await fetch(SEARCH_URL + encodeURIComponent(term));
        const data = await response.json();
        if (data.meals) {
          // Add non-duplicate recipes
          data.meals.forEach((meal) => {
            if (
              !holidayRecipes.some(
                (existing) => existing.idMeal === meal.idMeal
              )
            ) {
              holidayRecipes.push(meal);
            }
          });
        }
      }

      // Also fetch specific categories for sides and desserts
      const categories = ["Side", "Salad", "Dessert"];
      for (const category of categories) {
        const response = await fetch(
          CATEGORY_FILTER_BASE + encodeURIComponent(category)
        );
        const data = await response.json();
        if (data.meals) {
          data.meals.forEach((meal) => {
            if (
              !holidayRecipes.some(
                (existing) => existing.idMeal === meal.idMeal
              )
            ) {
              holidayRecipes.push(meal);
            }
          });
        }
      }
    } else if (
      holiday.toLowerCase() === "christmas" ||
      holiday.toLowerCase() === "thanksgiving"
    ) {
      console.log(`Fetching ${holiday} recipes...`);
      // Holiday dinner recipes search terms
      const searchTerms = [
        holiday.toLowerCase(),
        "turkey",
        "roast",
        "ham",
        "stuffing",
        "eggnog",
        "mince pie",
        "fruit cake",
      ];

      for (const term of searchTerms) {
        try {
          console.log(`Searching for ${term} recipes...`);
          const response = await fetch(
            `${SEARCH_URL}${encodeURIComponent(term)}`,
            fetchOptions
          );
          const data = await response.json();

          if (data.meals) {
            console.log(`Found ${data.meals.length} recipes for ${term}`);
            // Add non-duplicate recipes
            data.meals.forEach((meal) => {
              if (
                !holidayRecipes.some(
                  (existing) => existing.idMeal === meal.idMeal
                )
              ) {
                holidayRecipes.push(meal);
              }
            });
          }
        } catch (error) {
          console.log(`Error fetching ${term} recipes:`, error);
        }
      }
    } else if (holiday.toLowerCase() === "thanksgiving") {
      // Thanksgiving specific keywords
      const keywords = [
        "turkey",
        "stuffing",
        "cranberry",
        "gravy",
        "sweet potato",
        "pumpkin pie",
        "green bean",
        "casserole",
        "roll",
        "mashed potato",
      ];

      // Fetch recipes from relevant categories
      for (const category of categories) {
        const categoryResponse = await fetch(CATEGORY_FILTER_BASE + category);
        const categoryData = await categoryResponse.json();
        if (categoryData.meals) {
          // Get full details for each recipe to check ingredients and names
          for (const recipe of categoryData.meals) {
            const detailResponse = await fetch(
              DETAILS_LOOKUP_BASE + recipe.idMeal
            );
            const detailData = await detailResponse.json();
            if (detailData.meals && detailData.meals[0]) {
              const meal = detailData.meals[0];
              const mealName = meal.strMeal.toLowerCase();
              const instructions = meal.strInstructions
                ? meal.strInstructions.toLowerCase()
                : "";

              // Check if the recipe matches any of our keywords
              if (
                keywords.some(
                  (keyword) =>
                    mealName.includes(keyword.toLowerCase()) ||
                    instructions.includes(keyword.toLowerCase()) ||
                    // Check ingredients for matches
                    Object.keys(meal)
                      .filter((key) => key.startsWith("strIngredient"))
                      .some(
                        (key) =>
                          meal[key] &&
                          meal[key]
                            .toLowerCase()
                            .includes(keyword.toLowerCase())
                      )
                )
              ) {
                holidayRecipes.push(meal);
              }
            }
          }
        }
      }
    } else {
      // For other holidays, search by holiday name
      const response = await fetch(SEARCH_URL + holiday);
      const data = await response.json();
      holidayRecipes = data.meals || [];

      // Filter recipes by checking if they mention the holiday in their tags or instructions
      if (holidayRecipes.length > 0) {
        holidayRecipes = holidayRecipes.filter((recipe) => {
          const tags = recipe.strTags ? recipe.strTags.toLowerCase() : "";
          const instructions = recipe.strInstructions
            ? recipe.strInstructions.toLowerCase()
            : "";
          const holiday_lower = holiday.toLowerCase();
          return (
            tags.includes(holiday_lower) || instructions.includes(holiday_lower)
          );
        });
      }
    }

    if (holidayRecipes.length > 0) {
      renderRecipes(holidayRecipes);
    } else {
      recipeGrid.innerHTML = `<p style="color:#E53935; text-align:center; padding: 50px">No recipes found for ${holiday}. Try a different holiday.</p>`;
    }
  } catch (error) {
    console.error("Error fetching holiday recipes:", error);
    recipeGrid.innerHTML =
      '<p style="color:#E53935; text-align:center; padding: 50px">Failed to load recipes. Please try again.</p>';
  }
}

// Fetch and render Areas/Countries (from list.php?a=list)
async function fetchAndRenderAreas() {
  areaList.innerHTML = "";
  try {
    const response = await fetch(AREA_LIST_URL, fetchOptions);
    const data = await response.json();

    if (data.meals) {
      data.meals.forEach((area) => {
        const areaName = area.strArea;
        const listItem = document.createElement("li");
        const link = document.createElement("a");

        link.href = "#";
        link.textContent = areaName.toUpperCase();
        link.dataset.area = areaName;
        link.classList.add("area-filter");
        if (areaName === activeArea) {
          link.classList.add("active"); // Set default active area
        }

        listItem.appendChild(link);
        areaList.appendChild(listItem);
      });
    }
  } catch (error) {
    console.error("Error fetching areas:", error);
  }
}

// --- CORE FUNCTION: RENDERING RECIPE CARDS ---
function renderRecipes(recipes) {
  console.log("Rendering recipes:", recipes); // Debug log
  recipeGrid.innerHTML = "";

  if (!recipes || recipes.length === 0) {
    console.log("No recipes to render"); // Debug log
    recipeGrid.innerHTML =
      '<p style="color:#E53935; text-align:center; padding: 50px;">No recipes found. Try a different filter or search term.</p>';
    return;
  }

  console.log(`Rendering ${recipes.length} recipes`); // Debug log
  // Update global list cache
  currentRecipes = recipes;

  recipes.forEach((recipe) => {
    console.log("Recipe:", recipe.strMeal); // Debug log for each recipe
    const isSaved = isRecipeSaved(recipe.idMeal);
    const cardHTML = `
            <div class="recipe-card" data-id="${recipe.idMeal}">
                <button class="heart-icon ${isSaved ? "saved" : ""}" 
                      data-id="${recipe.idMeal}" 
                      data-name="${recipe.strMeal}">
                      ${isSaved ? "❤️" : "🤍"}
                </button>
                <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}">
                <h4>${recipe.strMeal}</h4>
            </div>
        `;
    recipeGrid.innerHTML += cardHTML;
  });
}

// --- API FETCHERS ---

// Fetches recipes based on Area (Country)
async function fetchRecipesByArea(area) {
  console.log("Fetching recipes for area:", area); // Debug log
  activeArea = area; // Update active area
  recipeGrid.innerHTML = `<p style="text-align:center; color:#E53935; padding: 50px;">Loading ${area} Recipes...</p>`;

  try {
    const url = AREA_FILTER_BASE + encodeURIComponent(area);
    console.log("Fetching from URL:", url); // Debug log
    const response = await fetch(url, fetchOptions);
    console.log("Response status:", response.status); // Debug log

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("API response:", data); // Debug log

    if (!data.meals) {
      console.log("No meals in response"); // Debug log
      recipeGrid.innerHTML = `<p style="color:#E53935; text-align:center; padding: 50px;">No recipes found for ${area}.</p>`;
      return;
    }

    renderRecipes(data.meals);
  } catch (error) {
    console.error(`Error fetching recipes for ${area}:`, error);
    recipeGrid.innerHTML =
      '<p style="color:#E53935; text-align:center; padding: 50px;">Failed to load recipes. Check API connection.</p>';
  }
}

// Fetches recipes based on Category
async function fetchRecipesByCategory(category) {
  recipeGrid.innerHTML = `<p style="text-align:center; color:#E53935; padding: 50px;">Loading ${category} Recipes...</p>`;

  try {
    const url = CATEGORY_FILTER_BASE + category;
    const response = await fetch(url);
    const data = await response.json();
    renderRecipes(data.meals);
  } catch (error) {
    console.error(`Error fetching recipes for ${category}:`, error);
    recipeGrid.innerHTML =
      '<p style="color:#E53935; text-align:center; padding: 50px;">Failed to load recipes. Check API connection.</p>';
  }
}

// Fetches and renders detailed recipe information
async function fetchRecipeDetails(idMeal, showSpinAgain = false) {
  try {
    const url = DETAILS_LOOKUP_BASE + idMeal;
    const response = await fetch(url);
    const data = await response.json();
    const meal = data.meals ? data.meals[0] : null;

    if (meal) {
      // Parse ingredients and measures
      let ingredientsList = "";
      for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ingredient && ingredient.trim()) {
          ingredientsList += `<li>${measure} ${ingredient}</li>`;
        }
      }

      detailContent.innerHTML = `
        <div class="detail-header">
          <div class="recipe-title-row">
            <h2>${meal.strMeal}</h2>
            <button class="save-recipe-btn ${
              isRecipeSaved(meal.idMeal) ? "saved" : ""
            }" 
                    data-id="${meal.idMeal}" 
                    data-name="${meal.strMeal}">
              ${isRecipeSaved(meal.idMeal) ? "❤️" : "🤍"}
            </button>
          </div>
          <p>Area: <strong>${meal.strArea}</strong> | Category: <strong>${
        meal.strCategory
      }</strong></p>
          <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
          ${
            showSpinAgain
              ? `<div style="text-align:center; margin-top:20px;"><button id="spin-again-btn" style="background:#E53935;color:#fff;border:none;padding:12px 28px;border-radius:6px;cursor:pointer;font-size:1.2em;">Don't Like It? Spin Again!</button></div>`
              : ""
          }
        </div>
        <div class="detail-text">
          <h3>Instructions</h3>
          <p>${meal.strInstructions}</p>
          <h3>Ingredients</h3>
          <ul>${ingredientsList}</ul>
          ${
            meal.strYoutube
              ? `<p><a href="${meal.strYoutube}" target="_blank" style="color:#E53935;">Watch on YouTube</a></p>`
              : ""
          }
        </div>
      `;
      setTimeout(() => {
        const spinAgainBtn = document.getElementById("spin-again-btn");
        if (spinAgainBtn) {
          spinAgainBtn.onclick = () => {
            recipeDetailView.classList.add("hidden");
            detailContent.innerHTML = "";
            spinWheelBtn.style.display = "none";
            contentArea.scrollIntoView({ behavior: "smooth" });
            spinWheelBtn.click();
          };
        }
        // Handle Go Back link to use browser history
        const goBackLink = document.getElementById("go-back-link");
        if (goBackLink) {
          goBackLink.onclick = (e) => {
            e.preventDefault();
            window.history.back();
            spinWheelBtn.style.display = "none";
            flagSpinner.style.display = "none";
            categorySelect.value = "";
            searchInput.value = "";
            fetchAndRenderAreas();
            recipeGrid.classList.remove("hidden");
            contentArea.scrollIntoView({ behavior: "smooth" });
            let loadingTimeout = setTimeout(() => {
              recipeGrid.innerHTML =
                '<p style="text-align:center; color:#E53935; padding: 50px">Loading Recipes...</p>';
            }, 500);
            fetchRecipesByArea("Canadian").then(() => {
              clearTimeout(loadingTimeout);
            });
          };
        }
      }, 100);
      recipeGrid.classList.add("hidden");
      recipeDetailView.classList.remove("hidden");
      contentArea.scrollIntoView({ behavior: "smooth" });
    } else {
      alert("Could not find recipe details.");
    }
  } catch (error) {
    console.error("Error fetching recipe details:", error);
    alert("Failed to load recipe details.");
  }
}

// --- VIEW & FILTER HANDLERS ---

function showGrid() {
  recipeDetailView.classList.add("hidden");
  recipeGrid.classList.remove("hidden");
  // Re-render the last known list state (currentRecipes)
  renderRecipes(currentRecipes);
}

// Searches current list (Client-Side)
function handleSearch() {
  const query = searchInput.value.toLowerCase().trim();

  // If search is empty, go back to the full last fetched list
  if (query === "") {
    renderRecipes(currentRecipes);
    return;
  }

  // Filter the current list by name
  const filtered = currentRecipes.filter((r) =>
    r.strMeal.toLowerCase().includes(query)
  );

  renderRecipes(filtered);
}

// --- EVENT LISTENERS ---
// Home Button Click Handler
document
  .querySelectorAll(".navbar a")[0]
  .addEventListener("click", async (event) => {
    event.preventDefault();
    // Hide all special views
    recipeDetailView.classList.add("hidden");
    detailContent.innerHTML = "";
    document.getElementById("mystery-boxes").style.display = "none";
    spinWheelBtn.style.display = "none";
    flagSpinner.style.display = "none";
    // Reset filters
    categorySelect.value = "";
    searchInput.value = "";
    // Repopulate country selection
    fetchAndRenderAreas();
    // Show grid immediately, then fetch random world recipes
    recipeGrid.classList.remove("hidden");
    contentArea.scrollIntoView({ behavior: "smooth" });
    // Fetch random recipes from around the world
    await fetchRandomWorldRecipes();
  });

// Holiday Select Handler
holidaySelect.addEventListener("change", async () => {
  searchInput.value = "";
  categorySelect.value = "";

  if (holidaySelect.value) {
    await fetchRecipesByHoliday(holidaySelect.value);
  } else {
    // If no holiday is selected, fetch all recipes
    await fetchAndDisplayAllRecipes();
  }
});

// Helper functions for view management
function showGridView() {
  recipeGrid.classList.remove("hidden");
  recipeDetailView.classList.add("hidden");
  document.getElementById("mystery-boxes").style.display = "none";
  spinWheelBtn.style.display = "none";
  flagSpinner.style.display = "none";
  detailContent.innerHTML = "";
}

function showMysteryView() {
  recipeGrid.classList.add("hidden");
  recipeDetailView.classList.add("hidden");
  spinWheelBtn.style.display = "inline-block";
  document.getElementById("mystery-boxes").style.display = "none";
  flagSpinner.style.display = "none";
}

// Recipe Card Click Handler
recipeGrid.addEventListener("click", (event) => {
  const heart = event.target.closest(".heart-icon");
  const card = event.target.closest(".recipe-card");

  if (heart) {
    // Handle heart icon click
    event.stopPropagation();
    const id = heart.dataset.id;
    const name = heart.dataset.name;
    toggleSaveRecipe(id, name);
    heart.classList.toggle("saved");
    updateSavedRecipesList();
  } else if (card) {
    // Handle card click for recipe details
    const recipeId = card.dataset.id;
    history.pushState(
      { view: "detail", recipeId: recipeId },
      "",
      `#recipe=${recipeId}`
    );
    fetchRecipeDetails(recipeId, false); // false = show Spin Again button
    event.preventDefault();
  }
});

// Detail View Click Handler
detailContent.addEventListener("click", (event) => {
  // Handle save button click
  if (event.target.classList.contains("save-recipe-btn")) {
    const button = event.target;
    const id = button.dataset.id;
    const name = button.dataset.name;
    toggleSaveRecipe(id, name);
    // Update button appearance
    button.textContent = isRecipeSaved(id) ? "❤️" : "🤍";
    button.classList.toggle("saved");
    // Update saved recipes list
    updateSavedRecipesList();
  }
});

// Category Select Handler (Triggers new API call)
categorySelect.addEventListener("change", async () => {
  searchInput.value = "";

  // Show loading state
  recipeGrid.innerHTML =
    '<p style="text-align:center; color:#E53935; padding: 50px">Loading recipes...</p>';

  try {
    // First get all recipes for the selected area
    const areaResponse = await fetch(AREA_FILTER_BASE + activeArea);
    const areaData = await areaResponse.json();
    let areaRecipes = areaData.meals || [];

    // If a category is selected, filter the area recipes by category
    if (categorySelect.value) {
      const filteredRecipes = [];

      // Get full details for each recipe to check its category
      for (const recipe of areaRecipes) {
        const detailResponse = await fetch(DETAILS_LOOKUP_BASE + recipe.idMeal);
        const detailData = await detailResponse.json();
        const recipeDetails = detailData.meals?.[0];

        // Only include recipes that match the selected category
        const isPorkCategory = categorySelect.value === "Pork";
        const hasPorkIngredient =
          isPorkCategory &&
          Object.keys(recipeDetails)
            .filter((key) => key.startsWith("strIngredient"))
            .some((key) => {
              const ingredient = recipeDetails[key]?.toLowerCase();
              return (
                ingredient &&
                [
                  "pork",
                  "bacon",
                  "pancetta",
                  "ham",
                  "prosciutto",
                  "chorizo",
                  "salami",
                  "sausage",
                  "pepperoni",
                  "guanciale",
                  "coppa",
                  "mortadella",
                  "speck",
                  "lardo",
                  "nduja",
                  "cotechino",
                  "capicola",
                  "bratwurst",
                  "ribs",
                  "belly pork",
                  "gelatin",
                  "gelatine",
                ].some((meat) => ingredient.includes(meat))
              );
            });

        if (
          recipeDetails &&
          (recipeDetails.strCategory === categorySelect.value ||
            hasPorkIngredient)
        ) {
          filteredRecipes.push(recipe);
        }
      }

      if (filteredRecipes.length > 0) {
        renderRecipes(filteredRecipes);
      } else {
        recipeGrid.innerHTML = `<p style="color:#E53935; text-align:center; padding: 50px">No ${categorySelect.value} recipes found in ${activeArea} cuisine. Try a different combination.</p>`;
      }
    } else {
      // If no category selected, show all recipes from the area
      renderRecipes(areaRecipes);
    }
  } catch (error) {
    console.error("Error filtering recipes:", error);
    recipeGrid.innerHTML =
      '<p style="color:#E53935; text-align:center; padding: 50px">Failed to load recipes. Please try again.</p>';
  }
});

// Search Button & Keyup Handler
searchButton.addEventListener("click", handleSearch);
searchInput.addEventListener("keyup", (event) => {
  if (event.key === "Enter") {
    handleSearch();
  }
});

// Area/Country Click Handler
areaList.addEventListener("click", async (event) => {
  const areaLink = event.target.closest(".area-filter");
  if (areaLink) {
    event.preventDefault();

    // Remove active class from all links
    areaList
      .querySelectorAll(".area-filter")
      .forEach((a) => a.classList.remove("active"));

    // Add active class to clicked link
    areaLink.classList.add("active");

    // Update active area
    const selectedArea = areaLink.dataset.area;
    activeArea = selectedArea;

    // Show loading state
    recipeGrid.innerHTML =
      '<p style="text-align:center; color:#E53935; padding: 50px">Loading recipes...</p>';

    try {
      // Fetch all recipes for the selected area
      const response = await fetch(AREA_FILTER_BASE + selectedArea);
      const data = await response.json();
      let recipes = data.meals || [];

      // If a category is selected, filter the recipes by category
      if (categorySelect.value) {
        const filteredRecipes = [];
        for (const recipe of recipes) {
          const detailResponse = await fetch(
            DETAILS_LOOKUP_BASE + recipe.idMeal
          );
          const detailData = await detailResponse.json();
          const recipeDetails = detailData.meals?.[0];

          if (
            recipeDetails &&
            recipeDetails.strCategory === categorySelect.value
          ) {
            filteredRecipes.push(recipe);
          }
        }
        recipes = filteredRecipes;
      }

      if (recipes.length > 0) {
        renderRecipes(recipes);
      } else {
        recipeGrid.innerHTML = `<p style="color:#E53935; text-align:center; padding: 50px">No ${
          categorySelect.value || ""
        } recipes found in ${selectedArea} cuisine. Try a different combination.</p>`;
      }
    } catch (error) {
      console.error("Error filtering recipes:", error);
      recipeGrid.innerHTML =
        '<p style="color:#E53935; text-align:center; padding: 50px">Failed to load recipes. Please try again.</p>';
    }

    searchInput.value = "";
  }
});

// Random Dish Button

// --- SPIN THE WHEEL FEATURE ---
const flagAreas = [
  { flag: "🇺🇸", area: "American" },
  { flag: "🇨🇦", area: "Canadian" },
  { flag: "🇮🇹", area: "Italian" },
  { flag: "🇫🇷", area: "French" },
  { flag: "🇯🇵", area: "Japanese" },
  { flag: "🇲🇽", area: "Mexican" },
  { flag: "🇬🇧", area: "British" },
  { flag: "🇨🇳", area: "Chinese" },
  { flag: "🇪🇸", area: "Spanish" },
  { flag: "🇬🇷", area: "Greek" },
  { flag: "🇮🇳", area: "Indian" },
  { flag: "🇹🇭", area: "Thai" },
  { flag: "🇻🇳", area: "Vietnamese" },
];

function getRandomArea() {
  const idx = Math.floor(Math.random() * flagAreas.length);
  return flagAreas[idx];
}

// Show Spin the Wheel button when Random Dish tab is clicked
randomDishBtn.addEventListener("click", (e) => {
  e.preventDefault();
  history.pushState({ view: "mystery" }, "", "#mystery");
  // Hide other content and show the button
  recipeGrid.innerHTML = "";
  detailContent.innerHTML = "";
  recipeDetailView.classList.add("hidden");
  flagSpinner.style.display = "none";
  spinWheelBtn.style.display = "inline-block";
});

// Spin animation and random recipe selection
spinWheelBtn.addEventListener("click", async () => {
  spinWheelBtn.style.display = "none";
  flagSpinner.style.display = "block";
  flagSpinner.style.fontSize = "24em";
  recipeGrid.classList.add("hidden");
  detailContent.innerHTML = "";
  recipeDetailView.classList.add("hidden");
  document.getElementById("mystery-boxes").style.display = "none";
  let spinOrder = [];
  for (let i = 0; i < 20; i++) {
    const idx = Math.floor(Math.random() * flagAreas.length);
    spinOrder.push(flagAreas[idx].flag);
  }
  let i = 0;
  const interval = setInterval(() => {
    flagSpinner.textContent = spinOrder[i];
    flagSpinner.style.fontSize = "24em";
    i++;
    if (i >= spinOrder.length) {
      clearInterval(interval);
      const chosen = getRandomArea();
      flagSpinner.textContent = chosen.flag;
      flagSpinner.style.fontSize = "30em";
      // Fetch recipes for the chosen area
      fetchRecipesByArea(chosen.area).then(() => {
        // Pause on the chosen flag for 1.2 seconds, then show mystery boxes
        setTimeout(() => {
          flagSpinner.style.display = "none";
          flagSpinner.style.fontSize = "24em";
          showMysteryBoxes();
        }, 1200);
      });
    }
  }, 80);
  // Function to fetch breakfast recipes (excluding desserts)
  async function fetchBreakfastRecipe() {
    try {
      // Search terms for breakfast items
      const breakfastTerms = [
        "breakfast",
        "eggs",
        "omelette",
        "pancake",
        "french toast",
        "croissant",
        "pastry",
      ];
      let breakfastRecipes = [];

      // Try each breakfast term
      for (const term of breakfastTerms) {
        const response = await fetch(SEARCH_URL + encodeURIComponent(term));
        const data = await response.json();

        if (data.meals) {
          // Filter out desserts and keep only breakfast-appropriate items
          const filteredMeals = data.meals.filter((meal) => {
            const mealName = meal.strMeal.toLowerCase();
            // Exclude dessert-like items
            return (
              !mealName.includes("cake") &&
              !mealName.includes("cookie") &&
              !mealName.includes("dessert") &&
              !mealName.includes("pudding") &&
              !mealName.includes("ice cream") &&
              !mealName.includes("cheesecake") &&
              !mealName.includes("brownie") &&
              !mealName.includes("pie") &&
              !mealName.includes("sweet") &&
              !(
                mealName.includes("chocolate") &&
                !mealName.includes("chocolate milk")
              )
            );
          });

          // Add non-duplicate recipes
          filteredMeals.forEach((meal) => {
            if (
              !breakfastRecipes.some(
                (existing) => existing.idMeal === meal.idMeal
              )
            ) {
              breakfastRecipes.push(meal);
            }
          });
        }
      }

      // Also search for eggs
      response = await fetch(SEARCH_URL + "eggs");
      data = await response.json();

      if (data.meals) {
        // Add egg recipes that aren't already in the list
        data.meals.forEach((recipe) => {
          if (!breakfastRecipes.some((r) => r.idMeal === recipe.idMeal)) {
            breakfastRecipes.push(recipe);
          }
        });
      }

      if (breakfastRecipes.length > 0) {
        // Return a random breakfast recipe
        return breakfastRecipes[
          Math.floor(Math.random() * breakfastRecipes.length)
        ];
      }
      return null;
    } catch (error) {
      console.error("Error fetching breakfast recipe:", error);
      return null;
    }
  }

  // Show three mystery recipe cards (breakfast, lunch, dinner)
  async function showMysteryBoxes() {
    const mysteryBoxes = document.getElementById("mystery-boxes");
    mysteryBoxes.innerHTML = "";
    mysteryBoxes.style.display = "block";

    // Keep track of used recipe IDs to prevent duplicates
    const usedRecipeIds = new Set();

    // Get a breakfast recipe first
    const breakfastRecipe = await fetchBreakfastRecipe();
    if (breakfastRecipe) {
      usedRecipeIds.add(breakfastRecipe.idMeal);
    }

    // Get other recipes for lunch and dinner (savory meals only)
    let otherRecipes = [];
    // Filter out desserts, breakfast items, and already used recipes
    const savoryRecipes = currentRecipes.filter((recipe) => {
      // Skip if we've already used this recipe
      if (usedRecipeIds.has(recipe.idMeal)) {
        return false;
      }

      const name = recipe.strMeal.toLowerCase();
      // Check for dessert-like items first
      if (
        name.includes("dessert") ||
        name.includes("cake") ||
        name.includes("cookie") ||
        name.includes("pudding") ||
        name.includes("pie") ||
        name.includes("sweet") ||
        name.includes("ice cream") ||
        (name.includes("chocolate") && !name.includes("chocolate milk"))
      ) {
        return false;
      }

      // Check category if available
      if (recipe.strCategory) {
        return (
          recipe.strCategory !== "Dessert" && recipe.strCategory !== "Breakfast"
        );
      }

      return true;
    });

    if (savoryRecipes.length >= 2) {
      // Shuffle the savory recipes
      const shuffled = savoryRecipes.slice().sort(() => Math.random() - 0.5);
      // Take first two that haven't been used
      for (const recipe of shuffled) {
        if (!usedRecipeIds.has(recipe.idMeal)) {
          otherRecipes.push(recipe);
          usedRecipeIds.add(recipe.idMeal);
          if (otherRecipes.length >= 2) break;
        }
      }
    }

    // If we still need more recipes, fetch from different areas
    if (otherRecipes.length < 2) {
      const areas = ["Italian", "Mexican", "Indian", "Chinese", "French"];
      for (const area of areas) {
        if (otherRecipes.length >= 2) break;
        try {
          const areaResponse = await fetch(AREA_FILTER_BASE + area);
          const areaData = await areaResponse.json();
          if (areaData.meals) {
            // Filter and shuffle area recipes
            const areaRecipes = areaData.meals
              .filter((recipe) => {
                if (usedRecipeIds.has(recipe.idMeal)) return false;
                const name = recipe.strMeal.toLowerCase();
                return (
                  !name.includes("dessert") &&
                  !name.includes("cake") &&
                  !name.includes("cookie") &&
                  !name.includes("pudding") &&
                  !name.includes("pie") &&
                  !name.includes("sweet")
                );
              })
              .sort(() => Math.random() - 0.5);

            // Add unique recipes
            for (const recipe of areaRecipes) {
              if (!usedRecipeIds.has(recipe.idMeal)) {
                otherRecipes.push(recipe);
                usedRecipeIds.add(recipe.idMeal);
                if (otherRecipes.length >= 2) break;
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching recipes from ${area}:`, error);
          continue;
        }
      }
    }

    // Combine breakfast with other meals
    const recipes = [
      breakfastRecipe || otherRecipes[0], // Fallback if no breakfast recipe found
      ...otherRecipes,
    ];
    const meals = ["Breakfast", "Lunch", "Dinner"];
    recipes.forEach((recipe, idx) => {
      const box = document.createElement("div");
      box.className = "mystery-box";
      box.style.display = "inline-block";
      box.style.width = "220px";
      box.style.height = "220px";
      box.style.margin = "30px";
      box.style.background = "#222";
      box.style.borderRadius = "12px";
      box.style.cursor = "pointer";
      box.style.position = "relative";
      box.style.verticalAlign = "top";
      box.style.textAlign = "center";
      box.style.fontSize = "1.5em";
      box.style.color = "#fff";
      box.innerHTML = `<div style="margin-top:70px;">${meals[idx]}<br>🍽️<br><span style='font-size:0.7em;'>Mystery Box</span></div>`;
      box.addEventListener("click", () => {
        // Reveal recipe and hide other boxes
        mysteryBoxes.style.display = "none";
        showRecipeDetails(recipe);
      });
      mysteryBoxes.appendChild(box);
    });
  }
});

// Helper to show recipe details (image, recipe, steps)
async function showRecipeDetails(recipe) {
  if (!recipe) return;

  // First fetch full recipe details to check category and ingredients
  try {
    const response = await fetch(DETAILS_LOOKUP_BASE + recipe.idMeal);
    const data = await response.json();
    const fullRecipe = data.meals?.[0];

    if (fullRecipe) {
      const mealName = fullRecipe.strMeal.toLowerCase();
      const isDesert =
        fullRecipe.strCategory === "Dessert" ||
        mealName.includes("cake") ||
        mealName.includes("cookie") ||
        mealName.includes("dessert") ||
        mealName.includes("pudding") ||
        mealName.includes("ice cream") ||
        mealName.includes("sweet") ||
        mealName.includes("pie") ||
        (mealName.includes("chocolate") &&
          !mealName.includes("chocolate milk"));

      // If it's a dessert, fetch a new savory recipe
      if (isDesert) {
        console.log("Found dessert, fetching new savory recipe...");
        // Try to get a savory recipe from current cuisine
        const areas = ["Italian", "Mexican", "Indian", "Chinese", "French"];
        for (const area of areas) {
          const areaResponse = await fetch(AREA_FILTER_BASE + area);
          const areaData = await areaResponse.json();
          if (areaData.meals) {
            // Get full details of random recipe from this area
            const randomRecipe =
              areaData.meals[Math.floor(Math.random() * areaData.meals.length)];
            const detailResponse = await fetch(
              DETAILS_LOOKUP_BASE + randomRecipe.idMeal
            );
            const detailData = await detailResponse.json();
            const newRecipe = detailData.meals?.[0];

            if (
              newRecipe &&
              newRecipe.strCategory !== "Dessert" &&
              !newRecipe.strMeal.toLowerCase().includes("dessert") &&
              !newRecipe.strMeal.toLowerCase().includes("cake") &&
              !newRecipe.strMeal.toLowerCase().includes("cookie") &&
              !newRecipe.strMeal.toLowerCase().includes("pudding") &&
              !newRecipe.strMeal.toLowerCase().includes("ice cream") &&
              !newRecipe.strMeal.toLowerCase().includes("sweet") &&
              !newRecipe.strMeal.toLowerCase().includes("pie")
            ) {
              recipe = newRecipe;
              break;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error checking recipe details:", error);
  }

  recipeGrid.classList.add("hidden");
  fetchRecipeDetails(recipe.idMeal, true); // true = show Spin Again button
}

// Search functionality
async function searchRecipes(query) {
  if (!query.trim()) return;

  try {
    // Show loading state
    recipeGrid.innerHTML =
      '<p style="text-align:center; padding: 50px">Searching recipes...</p>';

    // Create a delay promise to ensure minimum loading time
    const minimumLoadTime = new Promise((resolve) => setTimeout(resolve, 1000));

    // First try exact name search
    let response = await fetch(SEARCH_URL + encodeURIComponent(query));
    let data = await response.json();
    let recipes = [];

    if (data.meals) {
      recipes = data.meals;
    }

    // If no exact matches, try searching by first letter and filter results
    if (recipes.length === 0) {
      response = await fetch(
        BASE_URL + "search.php?f=" + encodeURIComponent(query.charAt(0))
      );
      data = await response.json();

      if (data.meals) {
        // Filter meals that contain the search term in their name or ingredients
        recipes = data.meals.filter((meal) => {
          const searchTerm = query.toLowerCase();
          const mealName = meal.strMeal.toLowerCase();

          // Check meal name
          if (mealName.includes(searchTerm)) return true;

          // Check ingredients
          for (let i = 1; i <= 20; i++) {
            const ingredient = meal[`strIngredient${i}`];
            if (ingredient && ingredient.toLowerCase().includes(searchTerm)) {
              return true;
            }
          }
          return false;
        });
      }
    }

    // Wait for both the minimum load time and the API responses
    await minimumLoadTime;

    // Only show results or no results message after all fetches are complete
    if (recipes.length > 0) {
      history.pushState(
        { view: "grid", search: query },
        "",
        `#search=${query}`
      );
      renderRecipes(recipes);
    } else {
      recipeGrid.innerHTML =
        '<p style="color:#E53935; text-align:center; padding: 50px">No recipes found. Try a different search term.</p>';
    }
  } catch (error) {
    console.error("Error searching recipes:", error);
    recipeGrid.innerHTML =
      '<p style="color:#E53935; text-align:center; padding: 50px">Error searching recipes. Please try again.</p>';
  }
}

// Add search event listeners
searchButton.addEventListener("click", () => {
  const query = searchInput.value;
  if (query.trim()) {
    searchRecipes(query);
  }
});

searchInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    const query = searchInput.value;
    if (query.trim()) {
      searchRecipes(query);
    }
  }
});

// Function to fetch random recipes from all nations
async function fetchRandomWorldRecipes() {
  // If we already have home page recipes cached, use them
  if (homePageRecipes.length > 0) {
    renderRecipes(homePageRecipes);
    return;
  }

  recipeGrid.innerHTML =
    '<p style="text-align:center; color:#E53935; padding: 50px;">Loading Recipes...</p>';

  try {
    // Use predefined areas instead of fetching them
    const areas = [
      "American",
      "Italian",
      "Chinese",
      "Mexican",
      "Indian",
      "Japanese",
      "French",
      "Greek",
      "Thai",
      "Spanish",
      "British",
      "Canadian",
      "Vietnamese",
      "Turkish",
      "Moroccan",
    ];

    const recipes = [];

    // Fetch recipes from each area
    for (const area of areas) {
      const areaResponse = await fetch(AREA_FILTER_BASE + area);
      const areaData = await areaResponse.json();

      if (areaData.meals) {
        // Get one recipe from this area
        const recipe = areaData.meals[0]; // Always use the first recipe for consistency

        // Fetch full recipe details
        const detailResponse = await fetch(DETAILS_LOOKUP_BASE + recipe.idMeal);
        const detailData = await detailResponse.json();

        if (detailData.meals && detailData.meals[0]) {
          recipes.push(detailData.meals[0]);
        }

        // Stop after getting 15 recipes
        if (recipes.length >= 15) {
          break;
        }
      }
    }

    // Store the recipes in the cache
    homePageRecipes = recipes.slice(0, 15);
    // Render the recipes
    renderRecipes(homePageRecipes);
  } catch (error) {
    console.error("Error fetching random world recipes:", error);
    recipeGrid.innerHTML =
      '<p style="text-align:center; color:#E53935; padding: 50px;">Error loading recipes. Please try again.</p>';
  }
}

// --- INITIAL PAGE LOAD ---
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM Content Loaded - Initializing application...");
  try {
    // Initialize holiday select first
    await initializeHolidaySelect();
    console.log("Holiday select initialized");

    // Load random world recipes instead of just Canadian
    await fetchRandomWorldRecipes();

    // Then fetch other data
    await Promise.all([
      fetchAndRenderCategories(), // Populate categories from API
      fetchAndRenderAreas(), // Populate areas/countries from API
    ]);
    updateSavedRecipesList(); // Initialize saved recipes list

    // Handle initial page load state
    const hash = window.location.hash;
    if (hash.startsWith("#recipe=")) {
      const recipeId = hash.replace("#recipe=", "");
      history.replaceState({ view: "detail", recipeId }, "", hash);
      await fetchRecipeDetails(recipeId, false);
    } else {
      history.replaceState({ view: "grid" }, "", "#");
      // No need to fetch Canadian recipes, random world recipes are already loaded
    }
  } catch (error) {
    console.error("Error during initialization:", error);
    recipeGrid.innerHTML =
      '<p style="color:#E53935; text-align:center; padding: 50px;">Failed to initialize application. Please refresh the page.</p>';
  }

  // Handle initial page load state
  const hash = window.location.hash;
  if (hash.startsWith("#recipe=")) {
    const recipeId = hash.replace("#recipe=", "");
    history.replaceState({ view: "detail", recipeId }, "", hash);
    fetchRecipeDetails(recipeId, false);
  } else if (hash === "#mystery") {
    history.replaceState({ view: "mystery" }, "", hash);
    showMysteryView();
  } else if (hash.startsWith("#search=")) {
    const query = decodeURIComponent(hash.replace("#search=", ""));
    searchInput.value = query;
    searchRecipes(query);
  } else {
    history.replaceState({ view: "grid" }, "", "#");
    // Keep the random world recipes that were already loaded
  }
});

// --- Global DOM Elements (Simplified for focus) ---
const savedRecipesList = document.getElementById("saved-recipes-list");
