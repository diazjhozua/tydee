# Changelog

## [1.9.0](https://github.com/diazjhozua/tydee/compare/v1.8.0...v1.9.0) (2026-08-11)


### Features

* **web-client:** retry once and show a wake-up notice on cold starts ([57b51e1](https://github.com/diazjhozua/tydee/commit/57b51e17d42459eb690422568533d6f65fa97e7b))


### Bug Fixes

* **web-client:** answer a friendly 503 from the auth bff when the api is unreachable ([15532d2](https://github.com/diazjhozua/tydee/commit/15532d273ff967a0767161444c7506b735b16bf8))

## [1.8.0](https://github.com/diazjhozua/tydee/compare/v1.7.0...v1.8.0) (2026-08-08)


### Features

* **web-client:** show the app version in settings ([a38c60f](https://github.com/diazjhozua/tydee/commit/a38c60ffeeb7847368d23534f0c4a600056e7660))
* **web-client:** tap a category to filter recent activity ([c6e25bc](https://github.com/diazjhozua/tydee/commit/c6e25bc1b68729fef5481645589eec5e8a0bebb4))


### Bug Fixes

* **web-client:** pin the turbopack workspace root ([8615ff5](https://github.com/diazjhozua/tydee/commit/8615ff563edf815387f0d6bfa73da3b413be2cb5))

## [1.7.0](https://github.com/diazjhozua/tydee/compare/v1.6.0...v1.7.0) (2026-08-07)


### Features

* allow resending the verification email ([13d3134](https://github.com/diazjhozua/tydee/commit/13d31349b6fbe3fd6fb11a1fc8017594e1729afe))
* **application:** add transfers between accounts ([97d5144](https://github.com/diazjhozua/tydee/commit/97d5144389bca2873d8ec8e729a2405fcd84ef5f))
* **web-api:** expose transfer endpoints ([cf84435](https://github.com/diazjhozua/tydee/commit/cf84435c8b57d2308d38c92d7ba1a39040994ad3))
* **web-client:** give each spending category its own icon and color ([755a8bb](https://github.com/diazjhozua/tydee/commit/755a8bbf3c08fb5fb55a51f8f2850cb4c701014e))
* **web-client:** move money between accounts ([8cd9daa](https://github.com/diazjhozua/tydee/commit/8cd9daaae932adcd67a3bc528e72ee76a0cc2b73))
* **web-client:** offer a resend from the unverified login notice ([8ea59e9](https://github.com/diazjhozua/tydee/commit/8ea59e9917b555921469a546ba1bff691ed48860))

## [1.6.0](https://github.com/diazjhozua/tydee/compare/v1.5.0...v1.6.0) (2026-08-06)


### Features

* **application:** break monthly spending down by category ([f1eb9ee](https://github.com/diazjhozua/tydee/commit/f1eb9ee54ec9fa0b869d83c85ff63a33f2921db2))
* **web-client:** add a branded 404 page ([0890689](https://github.com/diazjhozua/tydee/commit/089068943bf00bafd826bfeb1b509b417930c9f0))
* **web-client:** add page metadata, robots, and sitemap ([fd0a434](https://github.com/diazjhozua/tydee/commit/fd0a43495169acfa413aa1753c05fcb4c16ae65e))
* **web-client:** make the app installable ([a982ada](https://github.com/diazjhozua/tydee/commit/a982ada2069016304cf6495302da88fb219fe721))
* **web-client:** show where the money went on home ([428a631](https://github.com/diazjhozua/tydee/commit/428a6315000a53bb186c80743b5752c1875cfc08))

## [1.5.0](https://github.com/diazjhozua/tydee/compare/v1.4.0...v1.5.0) (2026-08-06)


### Features

* **application:** add forgot and reset password flows ([6713528](https://github.com/diazjhozua/tydee/commit/6713528c407ac7492a0253c933453708b75b31f6))
* **web-api:** expose password reset endpoints ([2004417](https://github.com/diazjhozua/tydee/commit/2004417595f00e437c1990cb8280cc61f6a8b1d2))
* **web-client:** add forgot and reset password pages ([fd230d3](https://github.com/diazjhozua/tydee/commit/fd230d39b346ab4970378fcc6bffa1a39791e51e))

## [1.4.0](https://github.com/diazjhozua/tydee/compare/v1.3.0...v1.4.0) (2026-08-05)


### Features

* **application:** record balance adjustments against computed balances ([fd00ab9](https://github.com/diazjhozua/tydee/commit/fd00ab94b0a189ea814255163f784b0f3efa1aa8))
* **web-api:** add set-balance and delete-adjustment endpoints ([df25aa6](https://github.com/diazjhozua/tydee/commit/df25aa6b1764d3544a0b814f6b7834f3081d370c))
* **web-client:** set account balances from settings ([5e02a2d](https://github.com/diazjhozua/tydee/commit/5e02a2d1a645aca2ab6db38d5ee36191c715a428))
* **web-client:** show adjustments in the activity list ([04a40cc](https://github.com/diazjhozua/tydee/commit/04a40cc93920ccefc1b686ed343fc1096b60ffaf))

## [1.3.0](https://github.com/diazjhozua/tydee/compare/v1.2.0...v1.3.0) (2026-08-03)


### Features

* **application:** add expense categories and recent-source queries ([1f295f9](https://github.com/diazjhozua/tydee/commit/1f295f9e6ac2e1f8d45970e4e1012a1d15de1c07))
* **web-api:** expose category field and suggestion endpoints ([02d7992](https://github.com/diazjhozua/tydee/commit/02d7992715b79a6989a01daf087141f9133528d9))
* **web-client:** pick expense categories from chips ([704719e](https://github.com/diazjhozua/tydee/commit/704719edd29b342abc71dfcf7a19520bf33f5a3d))
* **web-client:** suggest past income sources ([872886a](https://github.com/diazjhozua/tydee/commit/872886a9fa9dc09e48d5e8ce880ec946e6f1b920))

## [1.2.0](https://github.com/diazjhozua/tydee/compare/v1.1.0...v1.2.0) (2026-08-01)


### Features

* **application:** add month filters and an income detail query ([ca90ab9](https://github.com/diazjhozua/tydee/commit/ca90ab996eefe28f53c15750e119803f69022791))
* show income allocation breakdown on the activity list ([f08b7b0](https://github.com/diazjhozua/tydee/commit/f08b7b0ffcb86857d4b35467c3b83271fbca09ef))
* **web-api:** expose income detail and month query params ([4984ad6](https://github.com/diazjhozua/tydee/commit/4984ad6d465f84d7e59ee5ea807ccc9237784957))
* **web-client:** add month picker to home ([f4377d9](https://github.com/diazjhozua/tydee/commit/f4377d9cecd04bb499fe035ef8a63e3aa4eb964e))
* **web-client:** open incomes in an editable sheet ([2429032](https://github.com/diazjhozua/tydee/commit/242903216b797d26f515485b84288e2ec55e3354))

## [1.1.0](https://github.com/diazjhozua/tydee/compare/v1.0.0...v1.1.0) (2026-07-31)


### Features

* **application:** lock accounts after repeated failed logins ([493a262](https://github.com/diazjhozua/tydee/commit/493a262c0121b453b3dd68010e42bab1b3e57945))
* **web-api:** rate limit auth endpoints and harden http responses ([ef88448](https://github.com/diazjhozua/tydee/commit/ef88448c21075773c487eb4da6cfe84734830646))

## 1.0.0 (2026-07-31)


### Features

* **application:** add account commands and list query with computed balances ([312cf6e](https://github.com/diazjhozua/tydee/commit/312cf6e49e50ff2bea7cf441d0adf8a0c4569460))
* **application:** add command handler plumbing and auth abstractions ([c438639](https://github.com/diazjhozua/tydee/commit/c43863991d8d33b7bfc84fa4ab26b67df18da96b))
* **application:** add dashboard query for balances, monthly spend, and recent activity ([1231026](https://github.com/diazjhozua/tydee/commit/12310260a6bee17fdb27995843dee6e7be308a50))
* **application:** add expense commands and paginated list query ([e182796](https://github.com/diazjhozua/tydee/commit/e182796125d6184cd5140a3067c0deee14839061))
* **application:** add income commands with allocation validation ([0ded6a5](https://github.com/diazjhozua/tydee/commit/0ded6a52b48413b9694df2a1ddf5232dd8653071))
* **application:** implement register, verify email, login, and refresh token ([d37d831](https://github.com/diazjhozua/tydee/commit/d37d83146894fa3069a921eb9eb5d484811b8b6f))
* **contracts:** add accounts, incomes, expenses, and dashboard DTOs ([902d5bb](https://github.com/diazjhozua/tydee/commit/902d5bb880533c230ef040fb1a013ad595a50686))
* **contracts:** add auth request/response DTOs ([c91b9f2](https://github.com/diazjhozua/tydee/commit/c91b9f26930b20533619bfdbb7c6698d5ef4c9b0))
* **domain:** add account, income, and expense entities with errors ([76616a9](https://github.com/diazjhozua/tydee/commit/76616a903af87f36d641a8930f15789894528fc5))
* **domain:** add user currency preference with migration ([83bfc4c](https://github.com/diazjhozua/tydee/commit/83bfc4cfef574ec9dc7c12b8a1675920bbbc326f))
* **domain:** add User with email verification and refresh token model ([1539acc](https://github.com/diazjhozua/tydee/commit/1539acc530be113d4437382cd5b07799c65084c0))
* **infrastructure:** add EF configurations and budgeting migration ([ccc5173](https://github.com/diazjhozua/tydee/commit/ccc51738ab4a73ff8ff7e7e1a30f1ae1f475a4e6))
* **infrastructure:** add EF Core context, entity configurations, and domain event dispatch ([f81a032](https://github.com/diazjhozua/tydee/commit/f81a0322cbd7e0386636728a5e31523bd1bf2d6d))
* **infrastructure:** add initial database migration for users and refresh tokens ([7ecc43d](https://github.com/diazjhozua/tydee/commit/7ecc43dc41ef75c0eeb954496af0994d0172f218))
* **infrastructure:** add JWT token provider and password hasher ([b41bb42](https://github.com/diazjhozua/tydee/commit/b41bb42353fe221e3e75515e333f31d00b463eeb))
* **infrastructure:** add MailKit SMTP email sender and DI wiring ([65e4480](https://github.com/diazjhozua/tydee/commit/65e4480d69e09ff5a6c56fda9ee05e140bdcfdf8))
* **infrastructure:** switch database from postgres to sql server ([40851a7](https://github.com/diazjhozua/tydee/commit/40851a785ec0adc85217b25ccc81bff61cd4111c))
* **shared-kernel:** add Result, Error, Entity, and domain event primitives ([4804980](https://github.com/diazjhozua/tydee/commit/48049804a61f3ee1866c0faa4b0864be63a580da))
* **web-api:** add accounts, incomes, expenses, and dashboard endpoints ([3820120](https://github.com/diazjhozua/tydee/commit/3820120782f2f31b8d15cab0fd283f9e174ca256))
* **web-api:** add profile endpoint and currency setting ([906c05c](https://github.com/diazjhozua/tydee/commit/906c05cd4ecc55a91211dd3602b9c7db66918ef2))
* **web-api:** wire up auth endpoints and middleware pipeline ([b1fab77](https://github.com/diazjhozua/tydee/commit/b1fab77822c682b1b4fdb6c52e12875ff29a25d7))
* **web-client:** add auth store, api client, and BFF auth routes ([1694789](https://github.com/diazjhozua/tydee/commit/1694789461d4c2dc06036f6e5ab9d473edccd355))
* **web-client:** add bottom sheet, money, and icon primitives ([9d84dc8](https://github.com/diazjhozua/tydee/commit/9d84dc82c8af0ca535f37dbcbb77c8c3d78654e2))
* **web-client:** add home, setup wizard, entry dialogs, and settings ([3a62ecf](https://github.com/diazjhozua/tydee/commit/3a62ecf7d27b40c87715a9c77e1f62b32e1f6e24))
* **web-client:** add login, register, and verify-email pages ([cfc5f0e](https://github.com/diazjhozua/tydee/commit/cfc5f0e5540e18583677a2a7574ec10a293cbe44))
* **web-client:** add typed api modules and query hooks ([7cb3f08](https://github.com/diazjhozua/tydee/commit/7cb3f08fcc50503a1f1bd021d1ad6023b9f5840c))
* **web-client:** move entry forms into bottom sheets ([bfd34e4](https://github.com/diazjhozua/tydee/commit/bfd34e4f419697a62f9a2ccd755b8cc1e138ee6b))
* **web-client:** redesign home, setup, and settings screens ([102ad4a](https://github.com/diazjhozua/tydee/commit/102ad4a6b102845b0f34255f6edfffaa14b5729e))
* **web-client:** refresh design tokens and add dark mode support ([3df5028](https://github.com/diazjhozua/tydee/commit/3df5028861984cf5f8355d2ccbdb1be4b7333e77))


### Bug Fixes

* **application:** insert refresh tokens through the DbSet ([d0199e8](https://github.com/diazjhozua/tydee/commit/d0199e8fbf181c1f121bba45c44d94ad949cd814))
* **web-api:** allow cross-origin requests from the web client ([bc4edff](https://github.com/diazjhozua/tydee/commit/bc4edffc52ff44c7559e5ff47b5070a018965767))
* **web-api:** apply migrations on startup in all environments ([f395981](https://github.com/diazjhozua/tydee/commit/f39598166fed91c4f5c3984abf01aacc65aa94d7))
* **web-client:** mark link-rendered buttons as non-native ([eba5c7e](https://github.com/diazjhozua/tydee/commit/eba5c7ea6c0a69c399ed6b0fc293f9ed22eb3a18))
* **web-client:** stop home from bouncing back to setup on stale cache ([4198bb5](https://github.com/diazjhozua/tydee/commit/4198bb59b15dc2dd34c25730be8f91c125b217fb))
* **web-client:** switch to Inter and repair font variable wiring ([51a5dc3](https://github.com/diazjhozua/tydee/commit/51a5dc3ad2833264b68a7bc9a94d1dd404510098))
